import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { adminUserPatchBodySchema } from "@/app/modules/admin/schema/users-api.schema";
import { Prisma } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { loginProvidersFromRow } from "@/app/lib/login-providers";
import {
  adminApiRequire,
  adminJsonForbidden,
  adminJsonUnauthorized,
  assertCanAssignUserRole,
} from "@/backend/lib/admin-api-guard";
import { permissionAppRoleFromUserRole } from "@/backend/lib/auth";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/lib/admin-action-log";
import { adminRoleDefinitionHasIsActiveColumn } from "@/backend/lib/admin-role-definition-schema-capability";
import { getAdminPermissionKeysForUser } from "@/backend/lib/permission-resolver";
import { getCurrentAdminUser } from "@/backend/lib/session";

function mapUserListRow(row: {
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

export async function GET(request: Request) {
  const g = await adminApiRequire("user.read");
  if (!g.ok) return g.response;

  const { cursor, take } = parseUserListParams(request);

  const rows = await prisma.user.findMany({
    where: cursor != null ? { id: { lt: cursor } } : undefined,
    orderBy: { id: "desc" },
    take: take + 1,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
      adminPermissionRoleId: true,
    },
  });

  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;

  return NextResponse.json(
    {
      users: page.map(mapUserListRow),
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
}

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
  const actorHas = (p: string) =>
    actorKeys.includes("*") || actorKeys.includes(p);

  if (parsed.data.action === "permissionProfile") {
    if (actor.role !== "SUPER_ADMIN") {
      return adminJsonForbidden(
        "Only super admins can assign permission profiles.",
      );
    }
    const raw = parsed.data.adminPermissionRoleId;
    const roleId = raw === undefined || raw === null ? null : raw;
    if (roleId != null) {
      const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
      const def = roleHasIsActive
        ? await prisma.adminRoleDefinition.findFirst({
            where: { id: roleId, isActive: true },
            select: { id: true },
          })
        : await prisma.adminRoleDefinition.findFirst({
            where: { id: roleId },
            select: { id: true },
          });
      if (!def) {
        return NextResponse.json(
          { error: "unknown_permission_role" },
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
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        passwordHash: true,
        accounts: { select: { provider: true } },
        adminPermissionRoleId: true,
      },
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
    return NextResponse.json(mapUserListRow(updated));
  }

  if (parsed.data.action === "profile") {
    if (!actorHas("user.update")) {
      return adminJsonForbidden(
        "You don't have permission to edit user profiles.",
      );
    }
    const { userId, name, email } = parsed.data;
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
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          passwordHash: true,
          accounts: { select: { provider: true } },
          adminPermissionRoleId: true,
        },
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
      return NextResponse.json(mapUserListRow(updated));
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return NextResponse.json({ error: "email_taken" }, { status: 409 });
      }
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
  }

  if (parsed.data.action === "role") {
    const mayChangeRoles =
      actor.role === "SUPER_ADMIN" || actorHas("user.update");
    if (!mayChangeRoles) {
      return adminJsonForbidden(
        "You don't have permission to change user roles.",
      );
    }
    const assign = assertCanAssignUserRole(actor.role, parsed.data.role);
    if (!assign.ok) return assign.response;

    const u = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        role: parsed.data.role,
        ...(parsed.data.role === "USER" || parsed.data.role === "SUPER_ADMIN"
          ? { adminPermissionRoleId: null }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        passwordHash: true,
        accounts: { select: { provider: true } },
        adminPermissionRoleId: true,
      },
    });
    const actorIdRole = adminActorNumericId(actor);
    if (actorIdRole != null) {
      void logAdminAction({
        actorUserId: actorIdRole,
        action: "user.role_change",
        targetType: "User",
        targetId: String(u.id),
        metadata: { role: u.role },
      });
    }
    return NextResponse.json(mapUserListRow(u));
  }

  if (parsed.data.isActive === false) {
    if (!actorHas("user.ban")) {
      return adminJsonForbidden(
        "You don't have permission to block or unblock users.",
      );
    }
  } else if (!actorHas("user.update")) {
    return adminJsonForbidden("You don't have permission to reactivate users.");
  }

  const u = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { isActive: parsed.data.isActive },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
      adminPermissionRoleId: true,
    },
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
  return NextResponse.json(mapUserListRow(u));
}
