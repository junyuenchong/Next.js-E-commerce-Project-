import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import {
  adminRolePatchPermissionsSchema,
  adminRolePatchProfileMetaSchema,
  adminRolePostBodySchema,
} from "@/shared/schema";
import {
  adminApiRequire,
  adminJsonForbidden,
} from "@/backend/core/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { adminRoleDefinitionHasIsActiveColumn } from "@/backend/core/admin-role-definition-schema-capability";
import { invalidateAdminPermissionCaches } from "@/backend/modules/access-control";
import type { AdminSessionUser } from "@/backend/core/session";
import { jsonInternalServerError } from "@/backend/lib/api-error";

const LOCKED_PERMISSION_PROFILE_SLUG = "super_admin";
type RoleDefinitionLite = {
  id: number;
  slug: string;
  isSystem: boolean;
  isActive?: boolean;
};

function isPermissionProfileSlugLocked(slug: string): boolean {
  return slug === LOCKED_PERMISSION_PROFILE_SLUG;
}

function editablePermissionProfileSlugs(actorRole: UserRole): string[] {
  if (actorRole === "SUPER_ADMIN") return ["*"];
  return [];
}

function canEditPermissionProfileBySlug(actorRole: UserRole): boolean {
  if (actorRole === "SUPER_ADMIN") return true;
  return false;
}

async function getRoleDefinitionById(
  roleId: number,
  roleHasIsActive: boolean,
): Promise<RoleDefinitionLite | null> {
  if (roleHasIsActive) {
    const def = await prisma.adminRoleDefinition.findUnique({
      where: { id: roleId },
    });
    if (!def) return null;
    return def;
  }
  const def = await prisma.adminRoleDefinition.findUnique({
    where: { id: roleId },
    omit: { isActive: true },
  });
  if (!def) return null;
  return { ...def, isActive: true };
}

async function canMutateRoleDefinition(
  user: AdminSessionUser,
): Promise<boolean> {
  return canEditPermissionProfileBySlug(user.role);
}

/**
 * Loads role definitions. Probes for `isActive` first so we never issue a failing query
 * when the DB is behind migrations.
 */
async function loadRoleDefinitionsForRoleConfig() {
  const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
  if (roleHasIsActive) {
    return prisma.adminRoleDefinition.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { slug: "asc" }],
      include: {
        permissions: { select: { permissionId: true } },
      },
    });
  }
  const rows = await prisma.adminRoleDefinition.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    omit: { isActive: true },
    include: {
      permissions: { select: { permissionId: true } },
    },
  });
  return rows.map((r) => ({ ...r, isActive: true }));
}

async function createAdminRoleDefinitionWithoutIsActive(
  slug: string,
  name: string,
  sortOrder: number,
) {
  const rows = await prisma.$queryRaw<
    {
      id: number;
      slug: string;
      name: string;
      isSystem: boolean;
      sortOrder: number;
    }[]
  >`
    INSERT INTO "AdminRoleDefinition" ("slug", "name", "isSystem", "sortOrder")
    VALUES (${slug}, ${name}, false, ${sortOrder})
    RETURNING "id", "slug", "name", "isSystem", "sortOrder"
  `;
  const row = rows[0];
  if (!row) throw new Error("admin_role_insert_failed");
  return row;
}

export async function GET() {
  const g = await adminApiRequire("user.read");
  if (!g.ok) return g.response;

  try {
    const [catalog, defs] = await Promise.all([
      prisma.adminPermission.findMany({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: { id: true, key: true, label: true },
      }),
      loadRoleDefinitionsForRoleConfig(),
    ]);

    const roles = defs.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      isSystem: d.isSystem,
      isActive: d.isActive,
      sortOrder: d.sortOrder,
      permissionIds: d.permissions.map((p) => p.permissionId),
    }));

    const canEditProfiles = g.user.role === "SUPER_ADMIN";
    const canAddProfile = g.user.role === "SUPER_ADMIN";
    const canDeleteProfile = g.user.role === "SUPER_ADMIN";
    const editableRoleSlugs = editablePermissionProfileSlugs(g.user.role);

    return NextResponse.json({
      canEditProfiles,
      canAddProfile,
      /** @deprecated Prefer `canEditProfiles` — same value for backward compatibility. */
      canManage: canEditProfiles,
      canDeleteProfile,
      editableRoleSlugs,
      permissionCatalog: catalog,
      roles,
    });
  } catch (e: unknown) {
    return jsonInternalServerError(
      e,
      "[admin/role-config GET]",
      "role_config_failed",
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const g = await adminApiRequire("user.read");
    if (!g.ok) return g.response;

    const json = (await request.json().catch(() => null)) as unknown;

    const metaParsed = adminRolePatchProfileMetaSchema.safeParse(json);
    if (metaParsed.success) {
      const { roleId, name } = metaParsed.data;
      const nameTrimmed = name.trim();
      const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
      const def = await getRoleDefinitionById(roleId, roleHasIsActive);
      if (!def) {
        return NextResponse.json({ error: "unknown_role" }, { status: 404 });
      }
      if (def.isSystem) {
        return NextResponse.json(
          { error: "cannot_rename_system_profile" },
          { status: 400 },
        );
      }
      if (roleHasIsActive && "isActive" in def && def.isActive === false) {
        return NextResponse.json(
          { error: "role_profile_removed" },
          { status: 400 },
        );
      }
      if (!(await canMutateRoleDefinition(g.user))) {
        return adminJsonForbidden(
          "You are not allowed to edit this permission profile.",
        );
      }

      const updated = roleHasIsActive
        ? await prisma.adminRoleDefinition.update({
            where: { id: roleId },
            data: { name: nameTrimmed },
            include: { permissions: { select: { permissionId: true } } },
          })
        : await prisma.adminRoleDefinition.update({
            where: { id: roleId },
            data: { name: nameTrimmed },
            omit: { isActive: true },
            include: { permissions: { select: { permissionId: true } } },
          });

      await invalidateAdminPermissionCaches([roleId]);

      const aidRename = adminActorNumericId(g.user);
      if (aidRename != null) {
        void logAdminAction({
          actorUserId: aidRename,
          action: "role.profile_rename",
          targetType: "AdminRoleDefinition",
          targetId: String(roleId),
          metadata: { name: nameTrimmed, slug: updated.slug },
        });
      }

      return NextResponse.json({
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        isSystem: updated.isSystem,
        isActive: "isActive" in updated ? updated.isActive : true,
        sortOrder: updated.sortOrder,
        permissionIds: updated.permissions.map((p) => p.permissionId),
      });
    }

    const parsed = adminRolePatchPermissionsSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const { roleId, permissionIds } = parsed.data;
    const uniqueIds = [...new Set(permissionIds)];

    const validRows = await prisma.adminPermission.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const validSet = new Set(validRows.map((r) => r.id));
    for (const id of uniqueIds) {
      if (!validSet.has(id)) {
        return NextResponse.json(
          { error: "unknown_permission_id" },
          { status: 400 },
        );
      }
    }

    const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
    const def = await getRoleDefinitionById(roleId, roleHasIsActive);
    if (!def) {
      return NextResponse.json({ error: "unknown_role" }, { status: 404 });
    }
    if (isPermissionProfileSlugLocked(def.slug)) {
      return NextResponse.json(
        {
          error: "super_admin_permissions_locked",
          message:
            "Super admin must always have all permissions. This profile cannot be edited.",
        },
        { status: 400 },
      );
    }
    if (roleHasIsActive && "isActive" in def && def.isActive === false) {
      return NextResponse.json(
        { error: "role_profile_removed" },
        { status: 400 },
      );
    }
    if (!(await canMutateRoleDefinition(g.user))) {
      return adminJsonForbidden(
        "You are not allowed to edit this permission profile.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.adminRolePermission.deleteMany({ where: { roleId } });
      if (uniqueIds.length > 0) {
        await tx.adminRolePermission.createMany({
          data: uniqueIds.map((permissionId) => ({ roleId, permissionId })),
        });
      }
    });

    await invalidateAdminPermissionCaches([roleId]);

    const aidPerm = adminActorNumericId(g.user);
    if (aidPerm != null) {
      void logAdminAction({
        actorUserId: aidPerm,
        action: "role.permissions_update",
        targetType: "AdminRoleDefinition",
        targetId: String(roleId),
        metadata: { slug: def.slug, permissionCount: uniqueIds.length },
      });
    }

    const sortedIds = [...uniqueIds].sort((a, b) => a - b);
    return NextResponse.json({
      id: def.id,
      slug: def.slug,
      permissionIds: sortedIds,
    });
  } catch (error) {
    return jsonInternalServerError(error, "[admin/role-config PATCH]");
  }
}

export async function POST(request: Request) {
  try {
    const g = await adminApiRequire("user.read");
    if (!g.ok) return g.response;
    if (g.user.role !== "SUPER_ADMIN") {
      return adminJsonForbidden("Only super admins can add permission roles.");
    }

    const json = (await request.json().catch(() => null)) as unknown;
    const parsed = adminRolePostBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const slug = parsed.data.slug.trim().toLowerCase();
    const reserved = new Set(["super_admin", "admin"]);
    if (reserved.has(slug)) {
      return NextResponse.json({ error: "slug_reserved" }, { status: 409 });
    }

    const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
    const nameTrimmed = parsed.data.name.trim();

    if (roleHasIsActive) {
      const inactiveSameSlug = await prisma.adminRoleDefinition.findFirst({
        where: { slug, isActive: false },
      });
      if (inactiveSameSlug) {
        const restored = await prisma.adminRoleDefinition.update({
          where: { id: inactiveSameSlug.id },
          data: {
            isActive: true,
            name: nameTrimmed,
          },
          include: {
            permissions: { select: { permissionId: true } },
          },
        });
        await invalidateAdminPermissionCaches([restored.id]);
        const aidPost = adminActorNumericId(g.user);
        if (aidPost != null) {
          void logAdminAction({
            actorUserId: aidPost,
            action: "role.profile_create",
            targetType: "AdminRoleDefinition",
            targetId: String(restored.id),
            metadata: { slug: restored.slug, restored: true },
          });
        }
        return NextResponse.json({
          id: restored.id,
          slug: restored.slug,
          name: restored.name,
          isSystem: restored.isSystem,
          isActive: restored.isActive,
          sortOrder: restored.sortOrder,
          permissionIds: restored.permissions.map((p) => p.permissionId),
        });
      }
    }

    const maxOrder = await prisma.adminRoleDefinition.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

    if (roleHasIsActive) {
      try {
        const created = await prisma.adminRoleDefinition.create({
          data: {
            slug,
            name: nameTrimmed,
            isSystem: false,
            isActive: true,
            sortOrder,
          },
        });
        const aidCreate = adminActorNumericId(g.user);
        if (aidCreate != null) {
          void logAdminAction({
            actorUserId: aidCreate,
            action: "role.profile_create",
            targetType: "AdminRoleDefinition",
            targetId: String(created.id),
            metadata: { slug: created.slug },
          });
        }
        return NextResponse.json({
          id: created.id,
          slug: created.slug,
          name: created.name,
          isSystem: created.isSystem,
          isActive: created.isActive,
          sortOrder: created.sortOrder,
          permissionIds: [] as number[],
        });
      } catch {
        return NextResponse.json({ error: "slug_taken" }, { status: 409 });
      }
    }

    const existingSlug = await prisma.adminRoleDefinition.findUnique({
      where: { slug },
      omit: { isActive: true },
    });
    if (existingSlug) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }

    try {
      const created = await createAdminRoleDefinitionWithoutIsActive(
        slug,
        nameTrimmed,
        sortOrder,
      );
      const aidLegacy = adminActorNumericId(g.user);
      if (aidLegacy != null) {
        void logAdminAction({
          actorUserId: aidLegacy,
          action: "role.profile_create",
          targetType: "AdminRoleDefinition",
          targetId: String(created.id),
          metadata: { slug: created.slug },
        });
      }
      return NextResponse.json({
        id: created.id,
        slug: created.slug,
        name: created.name,
        isSystem: created.isSystem,
        isActive: true,
        sortOrder: created.sortOrder,
        permissionIds: [] as number[],
      });
    } catch (error) {
      return jsonInternalServerError(
        error,
        "[admin/role-config POST legacy insert]",
        "create_failed",
      );
    }
  } catch (error) {
    return jsonInternalServerError(error, "[admin/role-config POST]");
  }
}

export async function DELETE(request: Request) {
  try {
    const g = await adminApiRequire("user.read");
    if (!g.ok) return g.response;
    if (g.user.role !== "SUPER_ADMIN") {
      return adminJsonForbidden(
        "Only super admins can remove permission profiles.",
      );
    }

    const idRaw = new URL(request.url).searchParams.get("id")?.trim();
    const roleId =
      idRaw != null && idRaw !== "" ? Number.parseInt(idRaw, 10) : NaN;
    if (!Number.isFinite(roleId) || roleId < 1) {
      return NextResponse.json(
        { error: "missing_or_invalid_id" },
        { status: 400 },
      );
    }

    const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
    const def = await getRoleDefinitionById(roleId, roleHasIsActive);
    if (!def) {
      return NextResponse.json({ error: "unknown_role" }, { status: 404 });
    }
    if (def.isSystem) {
      return NextResponse.json(
        { error: "cannot_delete_system_role" },
        { status: 400 },
      );
    }
    if (roleHasIsActive && "isActive" in def && def.isActive === false) {
      return NextResponse.json({ error: "already_removed" }, { status: 400 });
    }

    if (!roleHasIsActive) {
      return NextResponse.json(
        {
          error: "profile_remove_unavailable",
          message:
            "This database has no AdminRoleDefinition.isActive column yet. Profile removal requires that column once your schema is updated.",
        },
        { status: 503 },
      );
    }

    await prisma.$transaction([
      prisma.user.updateMany({
        where: { adminPermissionRoleId: roleId },
        data: { adminPermissionRoleId: null },
      }),
      prisma.adminRoleDefinition.update({
        where: { id: roleId },
        data: { isActive: false },
      }),
    ]);

    await invalidateAdminPermissionCaches([roleId]);
    const aidDel = adminActorNumericId(g.user);
    if (aidDel != null) {
      void logAdminAction({
        actorUserId: aidDel,
        action: "role.profile_remove",
        targetType: "AdminRoleDefinition",
        targetId: String(roleId),
        metadata: { slug: def.slug },
      });
    }
    return NextResponse.json({
      ok: true,
      removed: true,
      roleId,
      slug: def.slug,
    });
  } catch (error) {
    return jsonInternalServerError(error, "[admin/role-config DELETE]");
  }
}
