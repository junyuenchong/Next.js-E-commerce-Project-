// queries role and permission persistence needed for admin access-control decisions.
import prisma from "@/app/lib/prisma";
import {
  deleteCacheKeys,
  getCachedJson,
  setCachedJson,
} from "@/backend/modules/db/redis";

// prefix for permission cache keys.
const CACHE_PREFIX = "admin:perm:v1:";
// permission cache TTL in seconds.
const CACHE_TTL_SECONDS = 120;

// in-memory flag for `AdminRoleDefinition.isActive` schema capability.
let cachedAdminRoleHasIsActive: true | null = null;

// build Redis cache key for role id.
function cacheKeyForRoleId(roleId: number) {
  return `${CACHE_PREFIX}role:${roleId}`;
}

/**
 * Handles admin role definition has is active column.
 */
export async function adminRoleDefinitionHasIsActiveColumn(): Promise<boolean> {
  if (cachedAdminRoleHasIsActive === true) return true;
  try {
    const rows = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint AS c
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'AdminRoleDefinition'
        AND column_name = 'isActive'
    `;
    const has = Number(rows[0]?.c ?? 0) > 0;
    if (has) cachedAdminRoleHasIsActive = true;
    return has;
  } catch {
    return false;
  }
}

/**
 * Handles reset admin role definition is active cache.
 */
export function resetAdminRoleDefinitionIsActiveCache() {
  cachedAdminRoleHasIsActive = null;
}

/**
 * Handles invalidate admin permission caches.
 */
export async function invalidateAdminPermissionCaches(roleIds: number[]) {
  if (roleIds.length === 0) return;
  await deleteCacheKeys(roleIds.map(cacheKeyForRoleId));
}

/**
 * Handles get effective permission keys by role id.
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
  // de-duplicate permission keys before caching.
  const keys = [
    ...new Set(
      rows.map((r: { permission: { key: string } }) => r.permission.key),
    ),
  ];
  await setCachedJson(cacheKey, keys, CACHE_TTL_SECONDS);
  return keys as string[];
}

/**
 * Handles get role definition id by slug.
 */
export async function getRoleDefinitionIdBySlug(
  slug: string,
): Promise<number | null> {
  const def = await prisma.adminRoleDefinition.findUnique({
    where: { slug },
    select: { id: true },
  });
  return def?.id ?? null;
}

/**
 * Handles get role definition id by id.
 */
export async function getRoleDefinitionIdById(
  roleId: number,
): Promise<number | null> {
  const def = await prisma.adminRoleDefinition.findFirst({
    where: { id: roleId },
    select: { id: true },
  });
  return def?.id ?? null;
}

/**
 * Handles get active role definition id by id.
 */
export async function getActiveRoleDefinitionIdById(
  roleId: number,
): Promise<number | null> {
  const def = await prisma.adminRoleDefinition.findFirst({
    where: { id: roleId, isActive: true },
    select: { id: true },
  });
  return def?.id ?? null;
}
