// Feature: Handles admin authorization checks and permission-gated response helpers.
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

// Note: standard forbidden/unauthorized messages for admin API responses.
export const ADMIN_FORBIDDEN_MESSAGE = "You don't have permission to do this.";
export const ADMIN_UNAUTHORIZED_MESSAGE = "Please sign in to continue.";

// Feature: return 401 JSON response for unauthorized (not logged in).
export function adminJsonUnauthorized() {
  return NextResponse.json(
    { error: "unauthorized", message: ADMIN_UNAUTHORIZED_MESSAGE },
    { status: 401 },
  );
}

// Feature: return 403 JSON response for forbidden (user lacks permission).
export function adminJsonForbidden(
  message: string = ADMIN_FORBIDDEN_MESSAGE,
  errorCode: string = "forbidden",
) {
  return NextResponse.json({ error: errorCode, message }, { status: 403 });
}

// Note: success result shape for admin permission guard.
export type AdminGuardOk = { ok: true; user: AdminSessionUser };

// Note: failure result shape for admin permission guard with response.
export type AdminGuardFail = { ok: false; response: NextResponse };

async function requireAdminUserOrResponse(): Promise<
  { ok: true; user: AdminSessionUser } | AdminGuardFail
> {
  const user = await getCurrentAdminUser();
  if (!user) return { ok: false, response: adminJsonUnauthorized() };
  return { ok: true, user };
}

// Guard: require a single admin permission key.
export async function adminApiRequire(
  permission: string,
): Promise<AdminGuardOk | AdminGuardFail> {
  const current = await requireAdminUserOrResponse();
  if (!current.ok) return current;
  const { user } = current;
  if (!(await adminUserHasPermission(user, permission))) {
    return { ok: false, response: adminJsonForbidden() };
  }
  return { ok: true, user };
}

// Guard: require at least one permission from the provided list.
export async function adminApiRequireAny(
  permissions: string[],
): Promise<AdminGuardOk | AdminGuardFail> {
  const current = await requireAdminUserOrResponse();
  if (!current.ok) return current;
  const { user } = current;
  for (const permission of permissions) {
    if (await adminUserHasPermission(user, permission))
      return { ok: true, user };
  }
  return { ok: false, response: adminJsonForbidden() };
}

// Guard: require catalog access capability for current admin.
export async function adminApiRequireCatalogAccess(): Promise<
  AdminGuardOk | AdminGuardFail
> {
  const current = await requireAdminUserOrResponse();
  if (!current.ok) return current;
  const { user } = current;
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

// Guard: returns whether acting role can assign target role (never SUPER_ADMIN).
export function canAssignTargetUserRole(
  _actingRole: UserRole,
  targetRole: UserRole,
): boolean {
  return targetRole !== "SUPER_ADMIN";
}

// Guard: validate assignable target role and return typed forbidden response.
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

// Note: error type for unauthorized admin action (not logged in).
export class AdminActionUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AdminActionUnauthorizedError";
  }
}

// Note: error type for forbidden admin action (permission missing).
export class AdminActionForbiddenError extends Error {
  constructor(message = "You don't have permission to do this.") {
    super(message);
    this.name = "AdminActionForbiddenError";
  }
}

// Guard: throw when current admin lacks required permission.
export async function requireAdminPermission(
  permission: string,
): Promise<void> {
  const user = await getCurrentAdminUser();
  if (!user) throw new AdminActionUnauthorizedError();
  if (!(await adminUserHasPermission(user, permission))) {
    throw new AdminActionForbiddenError();
  }
}

// Guard: throw when current admin lacks catalog access.
export async function requireAdminCatalogAccess(): Promise<void> {
  const user = await getCurrentAdminUser();
  if (!user) throw new AdminActionUnauthorizedError();
  if (!(await adminUserHasCatalogAccess(user))) {
    throw new AdminActionForbiddenError();
  }
}
