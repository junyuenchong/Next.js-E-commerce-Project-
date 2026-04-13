/**
 * Hardcoded permission strings (admin / staff only; storefront USER has no admin grants).
 * Built-in role defaults are seeded in the DB (`AdminPermission` ids + `AdminRolePermission` links);
 * this file lists valid keys and labels for the admin UI and API validation.
 */
export type Permission =
  | "user.read"
  | "user.update"
  | "user.ban"
  | "order.read"
  | "order.update"
  | "order.refund"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "coupon.read"
  | "coupon.manage"
  | "role.profile.update"
  | "role.profile.delete"
  | "audit.read";

/** Built-in RBAC profile slugs (`UserRole.USER` is excluded — customers have no admin permissions). */
export type AppPermissionRole = "super_admin" | "admin" | "staff";

/**
 * Default matrix for built-in profiles (also seeded in `AdminRolePermission`).
 *
 * | Permission     | super_admin | admin | staff |
 * |----------------|------------|-------|-------|
 * | (all)          | *          | each  | subset|
 * | user.read      | ✓          | ✓     | ✓     |
 * | user.update    | ✓          | ✓     | —     |
 * | user.ban       | ✓          | ✓     | —     |
 * | order.read     | ✓          | ✓     | ✓     |
 * | order.update   | ✓          | ✓     | —     |
 * | order.refund   | ✓          | ✓     | —     |
 * | product.*      | ✓          | ✓     | —     |
 */
export const rolePermissions: Record<AppPermissionRole, string[]> = {
  super_admin: ["*"],

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
    "role.profile.update",
    "audit.read",
  ],

  staff: ["user.read", "order.read", "coupon.read", "audit.read"],
};

/** Every assignable admin permission (for matrix / docs). */
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
  "role.profile.update",
  "role.profile.delete",
  "audit.read",
] as const;

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
  "role.profile.update": "Edit permission profiles",
  "role.profile.delete": "Remove permission profiles",
  "audit.read": "View admin audit log",
};

export function roleHasPermission(
  role: AppPermissionRole,
  permission: Permission,
): boolean {
  const list = rolePermissions[role];
  if (list.includes("*")) return true;
  return list.includes(permission);
}
