import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import {
  adminUserHasCatalogAccess,
  adminUserHasPermission,
} from "@/backend/modules/access-control/access-control.service";
import {
  getCurrentAdminUser,
  type AdminSessionUser,
} from "@/backend/modules/auth/session";

export const ADMIN_FORBIDDEN_MESSAGE = "You don't have permission to do this.";
export const ADMIN_UNAUTHORIZED_MESSAGE = "Please sign in to continue.";

export function adminJsonUnauthorized() {
  return NextResponse.json(
    { error: "unauthorized", message: ADMIN_UNAUTHORIZED_MESSAGE },
    { status: 401 },
  );
}

export function adminJsonForbidden(
  message: string = ADMIN_FORBIDDEN_MESSAGE,
  errorCode: string = "forbidden",
) {
  return NextResponse.json({ error: errorCode, message }, { status: 403 });
}

export type AdminGuardOk = { ok: true; user: AdminSessionUser };
export type AdminGuardFail = { ok: false; response: NextResponse };

export async function adminApiRequire(
  permission: string,
): Promise<AdminGuardOk | AdminGuardFail> {
  const user = await getCurrentAdminUser();
  if (!user) return { ok: false, response: adminJsonUnauthorized() };
  if (!(await adminUserHasPermission(user, permission))) {
    return { ok: false, response: adminJsonForbidden() };
  }
  return { ok: true, user };
}

export async function adminApiRequireAny(
  permissions: string[],
): Promise<AdminGuardOk | AdminGuardFail> {
  const user = await getCurrentAdminUser();
  if (!user) return { ok: false, response: adminJsonUnauthorized() };
  for (const permission of permissions) {
    if (await adminUserHasPermission(user, permission))
      return { ok: true, user };
  }
  return { ok: false, response: adminJsonForbidden() };
}

export async function adminApiRequireCatalogAccess(): Promise<
  AdminGuardOk | AdminGuardFail
> {
  const user = await getCurrentAdminUser();
  if (!user) return { ok: false, response: adminJsonUnauthorized() };
  if (!(await adminUserHasCatalogAccess(user))) {
    return {
      ok: false,
      response: adminJsonForbidden(
        "You don't have permission to view or manage the catalog.",
      ),
    };
  }
  return { ok: true, user };
}

export function canAssignTargetUserRole(
  _actingRole: UserRole,
  targetRole: UserRole,
): boolean {
  return targetRole !== "SUPER_ADMIN";
}

export function assertCanAssignUserRole(
  _actingRole: UserRole,
  targetRole: UserRole,
): { ok: true } | AdminGuardFail {
  if (targetRole === "SUPER_ADMIN") {
    return {
      ok: false,
      response: adminJsonForbidden(
        "Super admin accounts cannot be created from the admin app. Use `npm run db:seed` with ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD, or set the role in the database.",
        "forbidden_super_admin_assign",
      ),
    };
  }
  return { ok: true };
}

export class AdminActionUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AdminActionUnauthorizedError";
  }
}

export class AdminActionForbiddenError extends Error {
  constructor(message = "You don't have permission to do this.") {
    super(message);
    this.name = "AdminActionForbiddenError";
  }
}

export async function requireAdminPermission(
  permission: string,
): Promise<void> {
  const user = await getCurrentAdminUser();
  if (!user) throw new AdminActionUnauthorizedError();
  if (!(await adminUserHasPermission(user, permission))) {
    throw new AdminActionForbiddenError();
  }
}

export async function requireAdminCatalogAccess(): Promise<void> {
  const user = await getCurrentAdminUser();
  if (!user) throw new AdminActionUnauthorizedError();
  if (!(await adminUserHasCatalogAccess(user))) {
    throw new AdminActionForbiddenError();
  }
}
