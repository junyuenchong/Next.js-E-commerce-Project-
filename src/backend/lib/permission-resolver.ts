import prisma from "@/app/lib/prisma";
import { deleteCacheKeys, getCachedJson, setCachedJson } from "@/app/lib/redis";
import { adminRoleDefinitionHasIsActiveColumn } from "@/backend/lib/admin-role-definition-schema-capability";
import { permissionAppRoleFromUserRole } from "@/backend/lib/auth";
import type { AdminSessionUser } from "@/backend/lib/session";

const CACHE_PREFIX = "admin:perm:v1:";
const CACHE_TTL_SECONDS = 120;

function cacheKeyForRoleId(roleId: number) {
  return `${CACHE_PREFIX}role:${roleId}`;
}

export async function invalidateAdminPermissionCaches(roleIds: number[]) {
  if (roleIds.length === 0) return;
  await deleteCacheKeys(roleIds.map(cacheKeyForRoleId));
}

/**
 * Effective permission keys for a role profile id (DB only; seed supplies built-ins).
 */
export async function getEffectivePermissionKeysByRoleId(
  roleId: number,
): Promise<string[]> {
  const cacheKey = cacheKeyForRoleId(roleId);
  const cached = await getCachedJson<string[]>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.adminRolePermission.findMany({
    where: { roleId },
    include: { permission: { select: { key: true } } },
  });
  const keys = [...new Set(rows.map((r) => r.permission.key))];
  await setCachedJson(cacheKey, keys, CACHE_TTL_SECONDS);
  return keys;
}

/**
 * Resolves `AdminPermission` keys for an **admin panel** user (`STAFF` / `ADMIN` / `SUPER_ADMIN`).
 * `UserRole.USER` is not part of this path — see `getCurrentAdminUser` and `AdminSessionUser`.
 */
export async function getAdminPermissionKeysForUser(
  user: AdminSessionUser,
): Promise<string[]> {
  /** `SUPER_ADMIN` always uses the built-in definition; ignore any custom permission profile id. */
  if (user.role === "SUPER_ADMIN") {
    const def = await prisma.adminRoleDefinition.findUnique({
      where: { slug: "super_admin" },
      select: { id: true },
    });
    if (!def) {
      // Migrations/seed not applied yet — account role still means full platform access (e.g. demote other supers).
      return ["*"];
    }
    const keys = await getEffectivePermissionKeysByRoleId(def.id);
    if (keys.length === 0) {
      return ["*"];
    }
    return keys;
  }

  const customId = user.adminPermissionRoleId;
  if (customId != null) {
    const roleHasIsActive = await adminRoleDefinitionHasIsActiveColumn();
    const def = roleHasIsActive
      ? await prisma.adminRoleDefinition.findFirst({
          where: { id: customId, isActive: true },
          select: { id: true },
        })
      : await prisma.adminRoleDefinition.findFirst({
          where: { id: customId },
          select: { id: true },
        });
    if (def) {
      return getEffectivePermissionKeysByRoleId(def.id);
    }
  }

  const baseSlug = permissionAppRoleFromUserRole(user.role);
  if (!baseSlug) return [];
  const def = await prisma.adminRoleDefinition.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });
  if (!def) return [];
  return getEffectivePermissionKeysByRoleId(def.id);
}

export async function adminUserHasPermission(
  user: AdminSessionUser,
  permission: string,
): Promise<boolean> {
  const keys = await getAdminPermissionKeysForUser(user);
  if (keys.includes("*")) return true;
  return keys.includes(permission);
}

/** Any product/catalog capability (list products & categories, SSE, etc.). */
const CATALOG_PERMISSION_KEYS = [
  "product.create",
  "product.update",
  "product.delete",
] as const;

export async function adminUserHasCatalogAccess(
  user: AdminSessionUser,
): Promise<boolean> {
  const keys = await getAdminPermissionKeysForUser(user);
  if (keys.includes("*")) return true;
  return CATALOG_PERMISSION_KEYS.some((k) => keys.includes(k));
}
