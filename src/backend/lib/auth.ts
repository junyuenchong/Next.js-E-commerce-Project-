import type { UserRole } from "@prisma/client";
import type { AppPermissionRole } from "./permissions";

/**
 * Map account `UserRole` to seeded RBAC profile slug.
 * `USER` is storefront-only — no `AdminPermission` keys; use `canAccessAdminPanel` before RBAC.
 */
export function permissionAppRoleFromUserRole(
  role: UserRole,
): AppPermissionRole | null {
  switch (role) {
    case "SUPER_ADMIN":
      return "super_admin";
    case "ADMIN":
      return "admin";
    case "STAFF":
      return "staff";
    default:
      return null;
  }
}

export function canAccessAdminPanel(role: UserRole): boolean {
  return permissionAppRoleFromUserRole(role) != null;
}

const ADMIN_DASHBOARD = "/modules/admin/dashboard";

/**
 * After sign-in:
 * - SUPER_ADMIN / ADMIN / STAFF → admin dashboard (or another `/modules/admin/*` returnUrl only).
 * - USER → storefront; optional concrete `returnUrl` (not `/` or `/modules/user` alone).
 */
export function postAuthRedirectPath(
  role: UserRole | string,
  returnUrl?: string | null,
): string {
  if (String(role) === "SUPER_ADMIN") {
    return ADMIN_DASHBOARD;
  }

  if (canAccessAdminPanel(role as UserRole)) {
    const u = returnUrl?.trim();
    if (u && u.startsWith("/modules/admin") && !u.startsWith("//")) {
      if (u === "/modules/admin" || u === "/modules/admin/") {
        return ADMIN_DASHBOARD;
      }
      return u;
    }
    return ADMIN_DASHBOARD;
  }

  const u = returnUrl?.trim();
  const hasConcreteReturn =
    Boolean(u) &&
    u!.startsWith("/") &&
    !u!.startsWith("//") &&
    u !== "/" &&
    u !== "/modules/user";

  if (hasConcreteReturn && u) {
    if (u.startsWith("/modules/admin")) {
      return "/modules/user";
    }
    return u;
  }

  return "/modules/user";
}
