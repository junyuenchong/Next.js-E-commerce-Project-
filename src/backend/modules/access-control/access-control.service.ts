// resolves effective admin permissions and catalog access checks from role configuration.
import type { AdminSessionUser } from "@/backend/modules/auth/session";
import { permissionAppRoleFromUserRole } from "@/backend/modules/auth/auth.service";
import {
  adminRoleDefinitionHasIsActiveColumn,
  getActiveRoleDefinitionIdById,
  getEffectivePermissionKeysByRoleId,
  getRoleDefinitionIdById,
  getRoleDefinitionIdBySlug,
} from "@/backend/modules/access-control/access-control.repo";
import type { AppPermissionRole, Permission } from "@/shared/types";

// map each app permission role to its permission key list.
export const rolePermissions: Record<AppPermissionRole, string[]> = {
  super_admin: ["*"], // `*` means all permissions.
  admin: [
    "user.read",
    "user.update",
    "user.ban",
    "order.read",
    "order.update",
    "order.refund",
    "product.create",
    "product.update",
    "product.delete",
    "coupon.read",
    "coupon.manage",
    "audit.read",
  ],
  staff: ["user.read", "order.read", "coupon.read", "audit.read"],
};

// canonical list of admin permission keys (read-only).
export const ALL_ADMIN_PERMISSIONS: readonly Permission[] = [
  "user.read",
  "user.update",
  "user.ban",
  "order.read",
  "order.update",
  "order.refund",
  "product.create",
  "product.update",
  "product.delete",
  "coupon.read",
  "coupon.manage",
  "audit.read",
] as const;

// human-readable label map for each permission key.
export const PERMISSION_LABELS: Record<Permission, string> = {
  "user.read": "View users",
  "user.update": "Edit users (role, profile)",
  "user.ban": "Block or activate users",
  "order.read": "View orders",
  "order.update": "Update orders",
  "order.refund": "Refund orders",
  "product.create": "Create products",
  "product.update": "Edit products & categories",
  "product.delete": "Delete products",
  "coupon.read": "View coupons",
  "coupon.manage": "Create & edit coupons",
  "audit.read": "View admin audit log",
};

// permission keys that grant catalog access.
const CATALOG_PERMISSION_KEYS = [
  "product.create",
  "product.update",
  "product.delete",
] as const;

/**
 * Check whether a permission role grants the target permission key.
 */
export function roleHasPermission(
  role: AppPermissionRole,
  permission: Permission,
): boolean {
  const list = rolePermissions[role];
  if (list.includes("*")) return true; // `*` means all permissions.
  return list.includes(permission);
}

/**
 * Resolve effective permission keys for an admin user.
 */
export async function getAdminPermissionKeysForUser(
  user: AdminSessionUser,
): Promise<string[]> {
  // Super admins always have every permission.
  // This is intentionally hardcoded to avoid accidental lockout if role profile data is modified.
  if (user.role === "SUPER_ADMIN") {
    return ["*"];
  }

  // prefer custom permission profile when assigned.
  const customId = user.adminPermissionRoleId;
  if (customId != null) {
    const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
    // if `isActive` exists, only active profiles are eligible.
    const roleId = roleHasIsActive
      ? await getActiveRoleDefinitionIdById(customId)
      : await getRoleDefinitionIdById(customId);
    if (roleId != null) return getEffectivePermissionKeysByRoleId(roleId);
  }

  // use role default profile when no custom profile applies.
  const baseSlug = permissionAppRoleFromUserRole(user.role);
  if (!baseSlug) return [];
  const baseRoleId = await getRoleDefinitionIdBySlug(baseSlug);
  if (!baseRoleId) return [];
  return getEffectivePermissionKeysByRoleId(baseRoleId);
}

/**
 * Check whether user has a specific permission key.
 */
export async function adminUserHasPermission(
  user: AdminSessionUser,
  permission: string,
): Promise<boolean> {
  const keys = await getAdminPermissionKeysForUser(user);
  if (keys.includes("*")) return true; // `*` means all permissions.
  return keys.includes(permission);
}

/**
 * Check whether user has any catalog-management capability.
 */
export async function adminUserHasCatalogAccess(
  user: AdminSessionUser,
): Promise<boolean> {
  const keys = await getAdminPermissionKeysForUser(user);
  if (keys.includes("*")) return true; // `*` means all permissions.
  // any catalog permission key grants catalog access.
  return CATALOG_PERMISSION_KEYS.some((k) => keys.includes(k));
}
