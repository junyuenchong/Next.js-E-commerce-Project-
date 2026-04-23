/**
 * admin api route
 * handle role-config
 */

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

// Return which profile slugs this actor is allowed to edit ("*" means all).
function getEditablePermissionProfileSlugs(actorRole: UserRole): string[] {
  if (actorRole === "SUPER_ADMIN") return ["*"];
  return [];
}

// Only super admins can edit permission profiles.
function canEditPermissionProfiles(actorRole: UserRole): boolean {
  if (actorRole === "SUPER_ADMIN") return true;
  return false;
}

// Load one role definition by id with compatibility for databases missing `isActive`.
async function getRoleDefinitionByIdCompat(
  roleId: number,
  hasIsActiveColumn: boolean,
): Promise<RoleDefinitionLite | null> {
  if (hasIsActiveColumn) {
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

// Permission gate for mutating role definitions.
async function canMutateRoleDefinition(
  user: AdminSessionUser,
): Promise<boolean> {
  return canEditPermissionProfiles(user.role);
}

/**
 * role config loader
 * load role definitions with schema-safe fallback
 */
async function loadRoleDefinitionsForRoleConfig() {
  const hasIsActiveColumn = await adminRoleDefinitionHasIsActiveColumn();
  if (hasIsActiveColumn) {
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

// Return permission catalog + role definitions used by the admin permissions page.
export async function GET() {
  const guard = await adminApiRequire("user.read");
  if (!guard.ok) return guard.response;

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

    const canEditProfiles = guard.user.role === "SUPER_ADMIN";
    const canAddProfile = guard.user.role === "SUPER_ADMIN";
    const canDeleteProfile = guard.user.role === "SUPER_ADMIN";
    const editableRoleSlugs = getEditablePermissionProfileSlugs(
      guard.user.role,
    );

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
    const guard = await adminApiRequire("user.read");
    if (!guard.ok) return guard.response;

    const json = (await request.json().catch(() => null)) as unknown;

    const profileMetaPayload = adminRolePatchProfileMetaSchema.safeParse(json);
    if (profileMetaPayload.success) {
      const { roleId, name } = profileMetaPayload.data;
      const nameTrimmed = name.trim();
      const hasIsActiveColumn = await adminRoleDefinitionHasIsActiveColumn();
      const roleDef = await getRoleDefinitionByIdCompat(
        roleId,
        hasIsActiveColumn,
      );
      if (!roleDef) {
        return NextResponse.json({ error: "unknown_role" }, { status: 404 });
      }
      if (roleDef.isSystem) {
        return NextResponse.json(
          { error: "cannot_rename_system_profile" },
          { status: 400 },
        );
      }
      if (
        hasIsActiveColumn &&
        "isActive" in roleDef &&
        roleDef.isActive === false
      ) {
        return NextResponse.json(
          { error: "role_profile_removed" },
          { status: 400 },
        );
      }
      if (!(await canMutateRoleDefinition(guard.user))) {
        return adminJsonForbidden(
          "You are not allowed to edit this permission profile.",
        );
      }

      const updated = hasIsActiveColumn
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

      const aidRename = adminActorNumericId(guard.user);
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

    const permissionsPayload = adminRolePatchPermissionsSchema.safeParse(json);
    if (!permissionsPayload.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const { roleId, permissionIds } = permissionsPayload.data;
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

    const hasIsActiveColumn = await adminRoleDefinitionHasIsActiveColumn();
    const roleDef = await getRoleDefinitionByIdCompat(
      roleId,
      hasIsActiveColumn,
    );
    if (!roleDef) {
      return NextResponse.json({ error: "unknown_role" }, { status: 404 });
    }
    if (isPermissionProfileSlugLocked(roleDef.slug)) {
      return NextResponse.json(
        {
          error: "super_admin_permissions_locked",
          message:
            "Super admin must always have all permissions. This profile cannot be edited.",
        },
        { status: 400 },
      );
    }
    if (
      hasIsActiveColumn &&
      "isActive" in roleDef &&
      roleDef.isActive === false
    ) {
      return NextResponse.json(
        { error: "role_profile_removed" },
        { status: 400 },
      );
    }
    if (!(await canMutateRoleDefinition(guard.user))) {
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

    const aidPerm = adminActorNumericId(guard.user);
    if (aidPerm != null) {
      void logAdminAction({
        actorUserId: aidPerm,
        action: "role.permissions_update",
        targetType: "AdminRoleDefinition",
        targetId: String(roleId),
        metadata: { slug: roleDef.slug, permissionCount: uniqueIds.length },
      });
    }

    const sortedIds = [...uniqueIds].sort((a, b) => a - b);
    return NextResponse.json({
      id: roleDef.id,
      slug: roleDef.slug,
      permissionIds: sortedIds,
    });
  } catch (error) {
    return jsonInternalServerError(error, "[admin/role-config PATCH]");
  }
}

// Create a new custom permission profile (or restore inactive profile with same slug).
export async function POST(request: Request) {
  try {
    const guard = await adminApiRequire("user.read");
    if (!guard.ok) return guard.response;
    if (guard.user.role !== "SUPER_ADMIN") {
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

    const hasIsActiveColumn = await adminRoleDefinitionHasIsActiveColumn();
    const nameTrimmed = parsed.data.name.trim();

    if (hasIsActiveColumn) {
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
        const aidPost = adminActorNumericId(guard.user);
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

    if (hasIsActiveColumn) {
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
        const aidCreate = adminActorNumericId(guard.user);
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
      const aidLegacy = adminActorNumericId(guard.user);
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

// Soft-remove a custom permission profile and detach assigned users.
export async function DELETE(request: Request) {
  try {
    const guard = await adminApiRequire("user.read");
    if (!guard.ok) return guard.response;
    if (guard.user.role !== "SUPER_ADMIN") {
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

    const hasIsActiveColumn = await adminRoleDefinitionHasIsActiveColumn();
    const roleDef = await getRoleDefinitionByIdCompat(
      roleId,
      hasIsActiveColumn,
    );
    if (!roleDef) {
      return NextResponse.json({ error: "unknown_role" }, { status: 404 });
    }
    if (roleDef.isSystem) {
      return NextResponse.json(
        { error: "cannot_delete_system_role" },
        { status: 400 },
      );
    }
    if (
      hasIsActiveColumn &&
      "isActive" in roleDef &&
      roleDef.isActive === false
    ) {
      return NextResponse.json({ error: "already_removed" }, { status: 400 });
    }

    if (!hasIsActiveColumn) {
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
    const aidDel = adminActorNumericId(guard.user);
    if (aidDel != null) {
      void logAdminAction({
        actorUserId: aidDel,
        action: "role.profile_remove",
        targetType: "AdminRoleDefinition",
        targetId: String(roleId),
        metadata: { slug: roleDef.slug },
      });
    }
    return NextResponse.json({
      ok: true,
      removed: true,
      roleId,
      slug: roleDef.slug,
    });
  } catch (error) {
    return jsonInternalServerError(error, "[admin/role-config DELETE]");
  }
}
