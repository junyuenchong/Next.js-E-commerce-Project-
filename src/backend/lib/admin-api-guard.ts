import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import {
  adminUserHasCatalogAccess,
  adminUserHasPermission,
} from "./permission-resolver";
import { getCurrentAdminUser, type AdminSessionUser } from "./session";

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

/**
 * Use at the start of admin Route Handlers. Enforces auth + permission.
 */
export async function adminApiRequire(
  permission: string,
): Promise<AdminGuardOk | AdminGuardFail> {
  const user = await getCurrentAdminUser();
  if (!user) {
    return {
      ok: false,
      response: adminJsonUnauthorized(),
    };
  }

  if (!(await adminUserHasPermission(user, permission))) {
    return {
      ok: false,
      response: adminJsonForbidden(),
    };
  }

  return { ok: true, user };
}

/** Require at least one of the listed permissions (first match wins). */
export async function adminApiRequireAny(
  permissions: string[],
): Promise<AdminGuardOk | AdminGuardFail> {
  const user = await getCurrentAdminUser();
  if (!user) {
    return {
      ok: false,
      response: adminJsonUnauthorized(),
    };
  }

  for (const permission of permissions) {
    if (await adminUserHasPermission(user, permission)) {
      return { ok: true, user };
    }
  }

  return {
    ok: false,
    response: adminJsonForbidden(),
  };
}

/** List/read catalog admin APIs: allow if user has any product.* grant (not only `product.update`). */
export async function adminApiRequireCatalogAccess(): Promise<
  AdminGuardOk | AdminGuardFail
> {
  const user = await getCurrentAdminUser();
  if (!user) {
    return {
      ok: false,
      response: adminJsonUnauthorized(),
    };
  }

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

/**
 * Whether the app may set a user's role to `targetRole`.
 * `SUPER_ADMIN` is never assignable via API/UI — only seed / raw SQL.
 */
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
