/**
 * Admin HTTP route: users.
 */

// Admin users API: list customers/team accounts and perform controlled mutations.
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import {
  adminUserCreateBodySchema,
  adminUserDeleteBodySchema,
  adminUserPatchBodySchema,
} from "@/shared/schema";
import { Prisma } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { loginProvidersFromRow } from "@/backend/modules/auth/dto/login-providers.dto";
import {
  adminApiRequire,
  adminJsonForbidden,
  adminJsonUnauthorized,
} from "@/backend/core/admin-api-guard";
import { permissionAppRoleFromUserRole } from "@/backend/core/auth/auth.service";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { adminRoleDefinitionHasIsActiveColumn } from "@/backend/core/admin-role-definition-schema-capability";
import { getAdminPermissionKeysForUser } from "@/backend/modules/access-control";
import { hashPasswordUserService } from "@/backend/modules/user";
import { getCurrentAdminUser } from "@/backend/core/session";
import { jsonInternalServerError } from "@/backend/lib/api-error";
import { normalizeAdminLoginIdentifier } from "@/backend/modules/auth/auth.service";

// Team accounts are admin/staff accounts rather than customer accounts.
function isTeamRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "STAFF";
}

// Only super admins can create or delete team accounts.
function canCreateOrDeleteTeamAccount(actorRole: UserRole): boolean {
  return actorRole === "SUPER_ADMIN";
}

// Team accounts can only be changed by super admins.
function canMutateTeamAccount(
  actorRole: UserRole,
  targetRole: UserRole,
): boolean {
  if (!isTeamRole(targetRole)) return true;
  return actorRole === "SUPER_ADMIN";
}

const USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  passwordHash: true,
  accounts: { select: { provider: true } },
  adminPermissionRoleId: true,
} as const;

// Read just the user's role (used for permission checks).
async function getUserRoleById(userId: number): Promise<UserRole | null> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return target?.role ?? null;
}

// Convert database row into response shape used by admin UI.
function serializeUserListRow(row: {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  passwordHash: string | null;
  accounts: { provider: string }[];
  adminPermissionRoleId: number | null;
}) {
  const { passwordHash, accounts, ...rest } = row;
  return {
    ...rest,
    loginProviders: loginProvidersFromRow(passwordHash, accounts),
  };
}

// Parse cursor pagination params for user list endpoint.
function parseUserListParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursorRaw = searchParams.get("cursor");
  const limitRaw = searchParams.get("limit");
  const cursorId =
    cursorRaw != null && cursorRaw !== ""
      ? Number.parseInt(cursorRaw, 10)
      : undefined;
  const limit = limitRaw != null ? Number.parseInt(limitRaw, 10) : 50;
  const take = Math.min(100, Math.max(1, Number.isFinite(limit) ? limit : 50));
  const cursor =
    cursorId != null && Number.isFinite(cursorId) ? cursorId : undefined;
  return { cursor, take };
}

// Return paginated customer and team accounts for admin table.
export async function GET(request: Request) {
  try {
    const guard = await adminApiRequire("user.read");
    if (!guard.ok) return guard.response;

    const { cursor, take } = parseUserListParams(request);

    const rows = await prisma.user.findMany({
      where: cursor != null ? { id: { lt: cursor } } : undefined,
      orderBy: { id: "desc" },
      take: take + 1,
      select: USER_LIST_SELECT,
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? page[page.length - 1]!.id : null;

    return NextResponse.json(
      {
        users: page.map(serializeUserListRow),
        nextCursor,
        hasMore: nextCursor != null,
        limit: take,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Next-Cursor": nextCursor != null ? String(nextCursor) : "",
        },
      },
    );
  } catch (error) {
    return jsonInternalServerError(error, "[admin/api/users GET]");
  }
}

// Create a new team account (super admin only).
export async function POST(request: Request) {
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = adminUserCreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const actor = await getCurrentAdminUser();
  if (!actor) {
    return adminJsonUnauthorized();
  }
  if (!canCreateOrDeleteTeamAccount(actor.role)) {
    return adminJsonForbidden(
      "Only super admins can manage admin team accounts.",
    );
  }

  try {
    const normalizedEmail = normalizeAdminLoginIdentifier(parsed.data.email);
    const passwordHash = await hashPasswordUserService(parsed.data.password);
    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name:
          parsed.data.name == null
            ? null
            : parsed.data.name.trim() === ""
              ? null
              : parsed.data.name.trim(),
        passwordHash,
        // Guard: team account creation is now fixed to ADMIN.
        role: "ADMIN",
        isActive: parsed.data.isActive ?? true,
        adminPermissionRoleId: null,
      },
      select: USER_LIST_SELECT,
    });

    const actorId = adminActorNumericId(actor);
    if (actorId != null) {
      void logAdminAction({
        actorUserId: actorId,
        action: "user.create",
        targetType: "User",
        targetId: String(created.id),
        metadata: { role: created.role, email: created.email },
      });
    }

    return NextResponse.json(serializeUserListRow(created), { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    return jsonInternalServerError(error, "[admin/api/users POST]");
  }
}

// Delete an existing team account (super admin only).
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const bodyParsed = adminUserDeleteBodySchema.safeParse({
    userId: Number.parseInt(searchParams.get("userId") ?? "", 10),
  });
  if (!bodyParsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const actor = await getCurrentAdminUser();
  if (!actor) {
    return adminJsonUnauthorized();
  }
  if (!canCreateOrDeleteTeamAccount(actor.role)) {
    return adminJsonForbidden(
      "Only super admins can manage admin team accounts.",
    );
  }
  const actorId = adminActorNumericId(actor);

  const target = await prisma.user.findUnique({
    where: { id: bodyParsed.data.userId },
    select: { id: true, role: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (actorId != null && target.id === actorId) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }
  if (!isTeamRole(target.role)) {
    return NextResponse.json(
      {
        error: "invalid_target",
        message: "Only team accounts can be deleted.",
      },
      { status: 400 },
    );
  }

  try {
    await prisma.user.delete({ where: { id: target.id } });
    if (actorId != null) {
      void logAdminAction({
        actorUserId: actorId,
        action: "user.delete",
        targetType: "User",
        targetId: String(target.id),
        metadata: { role: target.role, email: target.email },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error: "has_relations",
          message:
            "Cannot delete this account because it is referenced by existing records.",
        },
        { status: 409 },
      );
    }
    return jsonInternalServerError(error, "[admin/api/users DELETE]");
  }
}

// Update user profile, permission profile, or active status.
export async function PATCH(request: Request) {
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = adminUserPatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const actor = await getCurrentAdminUser();
  if (!actor) {
    return adminJsonUnauthorized();
  }
  const appRole = permissionAppRoleFromUserRole(actor.role);
  if (!appRole) {
    return adminJsonForbidden(
      "You don't have access to change users with this account.",
    );
  }

  const actorKeys = await getAdminPermissionKeysForUser(actor);
  const hasActorPermission = (p: string) =>
    actorKeys.includes("*") || actorKeys.includes(p);

  // Permission profile actions
  if (parsed.data.action === "permissionProfile") {
    if (actor.role !== "SUPER_ADMIN") {
      return adminJsonForbidden(
        "Only super admins can assign permission profiles for admin team members.",
      );
    }
    const raw = parsed.data.adminPermissionRoleId;
    const roleId = raw === undefined || raw === null ? null : raw;
    if (roleId != null) {
      const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
      const def = roleHasIsActive
        ? await prisma.adminRoleDefinition.findFirst({
            where: { id: roleId, isActive: true },
            select: { id: true, slug: true },
          })
        : await prisma.adminRoleDefinition.findFirst({
            where: { id: roleId },
            select: { id: true, slug: true },
          });
      if (!def) {
        return NextResponse.json(
          { error: "unknown_permission_role" },
          { status: 400 },
        );
      }
      if (def.slug === "super_admin") {
        return NextResponse.json(
          { error: "super_admin_profile_forbidden" },
          { status: 400 },
        );
      }
    }
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (target.role === "USER") {
      return NextResponse.json({ error: "invalid_target" }, { status: 400 });
    }
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "super_admin_uses_builtin_permissions" },
        { status: 400 },
      );
    }
    const updated = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { adminPermissionRoleId: roleId },
      select: USER_LIST_SELECT,
    });
    const actorId = adminActorNumericId(actor);
    if (actorId != null) {
      void logAdminAction({
        actorUserId: actorId,
        action: "user.permission_profile",
        targetType: "User",
        targetId: String(updated.id),
        metadata: { adminPermissionRoleId: roleId },
      });
    }
    return NextResponse.json(serializeUserListRow(updated));
  }

  // Profile actions (name/email)
  if (parsed.data.action === "profile") {
    if (!hasActorPermission("user.update")) {
      return adminJsonForbidden(
        "You don't have permission to edit user profiles.",
      );
    }
    const { userId, name, email } = parsed.data;
    const targetRole = await getUserRoleById(userId);
    if (!targetRole) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!canMutateTeamAccount(actor.role, targetRole)) {
      return adminJsonForbidden(
        "Only super admins can update admin team profiles.",
      );
    }
    const data: { name?: string | null; email: string } = {
      email: email.trim().toLowerCase(),
    };
    if (name !== undefined) {
      data.name = name === null ? null : name.trim() || null;
    }
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: USER_LIST_SELECT,
      });
      const actorId = adminActorNumericId(actor);
      if (actorId != null) {
        void logAdminAction({
          actorUserId: actorId,
          action: "user.profile_update",
          targetType: "User",
          targetId: String(updated.id),
          metadata: { email: updated.email },
        });
      }
      return NextResponse.json(serializeUserListRow(updated));
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return NextResponse.json({ error: "email_taken" }, { status: 409 });
      }
      return jsonInternalServerError(
        e,
        "[admin/api/users PATCH profile]",
        "update_failed",
      );
    }
  }

  // Block or activate user (status)
  if (parsed.data.isActive === false) {
    if (!hasActorPermission("user.ban")) {
      return adminJsonForbidden(
        "You don't have permission to block or unblock users.",
      );
    }
  } else if (!hasActorPermission("user.update")) {
    return adminJsonForbidden("You don't have permission to reactivate users.");
  }
  const activeTargetRole = await getUserRoleById(parsed.data.userId);
  if (!activeTargetRole) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!canMutateTeamAccount(actor.role, activeTargetRole)) {
    return adminJsonForbidden(
      "Only super admins can activate or block admin team accounts.",
    );
  }

  try {
    const u = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { isActive: parsed.data.isActive },
      select: USER_LIST_SELECT,
    });
    const actorIdBan = adminActorNumericId(actor);
    if (actorIdBan != null) {
      void logAdminAction({
        actorUserId: actorIdBan,
        action: parsed.data.isActive ? "user.activate" : "user.ban",
        targetType: "User",
        targetId: String(u.id),
        metadata: { email: u.email },
      });
    }
    return NextResponse.json(serializeUserListRow(u));
  } catch (error) {
    return jsonInternalServerError(error, "[admin/api/users PATCH status]");
  }
}
