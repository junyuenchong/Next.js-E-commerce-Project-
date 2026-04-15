import type { AdminSessionUser } from "@/backend/modules/auth/session";
import { permissionAppRoleFromUserRole } from "@/backend/modules/auth/auth.service";
import {
  adminRoleDefinitionHasIsActiveColumn,
  getActiveRoleDefinitionIdById,
  getEffectivePermissionKeysByRoleId,
  getRoleDefinitionIdById,
  getRoleDefinitionIdBySlug,
} from "@/backend/modules/access-control/access-control.repo";
import type {
  AppPermissionRole,
  Permission,
} from "@/shared/types/access-control";

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

const CATALOG_PERMISSION_KEYS = [
  "product.create",
  "product.update",
  "product.delete",
] as const;

export function roleHasPermission(
  role: AppPermissionRole,
  permission: Permission,
): boolean {
  const list = rolePermissions[role];
  if (list.includes("*")) return true;
  return list.includes(permission);
}

export async function getAdminPermissionKeysForUser(
  user: AdminSessionUser,
): Promise<string[]> {
  if (user.role === "SUPER_ADMIN") {
    const roleId = await getRoleDefinitionIdBySlug("super_admin");
    if (!roleId) return ["*"];
    const keys = await getEffectivePermissionKeysByRoleId(roleId);
    return keys.length === 0 ? ["*"] : keys;
  }

  const customId = user.adminPermissionRoleId;
  if (customId != null) {
    const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
    const roleId = roleHasIsActive
      ? await getActiveRoleDefinitionIdById(customId)
      : await getRoleDefinitionIdById(customId);
    if (roleId != null) return getEffectivePermissionKeysByRoleId(roleId);
  }

  const baseSlug = permissionAppRoleFromUserRole(user.role);
  if (!baseSlug) return [];
  const baseRoleId = await getRoleDefinitionIdBySlug(baseSlug);
  if (!baseRoleId) return [];
  return getEffectivePermissionKeysByRoleId(baseRoleId);
}

export async function adminUserHasPermission(
  user: AdminSessionUser,
  permission: string,
): Promise<boolean> {
  const keys = await getAdminPermissionKeysForUser(user);
  if (keys.includes("*")) return true;
  return keys.includes(permission);
}

export async function adminUserHasCatalogAccess(
  user: AdminSessionUser,
): Promise<boolean> {
  const keys = await getAdminPermissionKeysForUser(user);
  if (keys.includes("*")) return true;
  return CATALOG_PERMISSION_KEYS.some((k) => keys.includes(k));
}
