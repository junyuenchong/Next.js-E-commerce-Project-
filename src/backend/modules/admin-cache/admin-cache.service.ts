// Module: Provides cached admin datasets with consistent Redis key invalidation helpers.
import {
  deleteCacheKeys,
  getCachedJson,
  setCachedJson,
} from "@/backend/modules/db/redis";

// version for all admin cache keys.
const ADMIN_CACHE_KEY_VERSION = "v1";

// redis keys used for admin cache values.
export const ADMIN_CACHE_KEYS = {
  analyticsSummary: `admin:${ADMIN_CACHE_KEY_VERSION}:analytics:summary`, // analytics summary key.
  couponsList: `admin:${ADMIN_CACHE_KEY_VERSION}:coupons:list`, // admin coupons list key.
  categoriesList: `admin:${ADMIN_CACHE_KEY_VERSION}:categories:list`, // admin categories list key.
} as const;

// tTL policy for admin cache values (seconds).
export const ADMIN_CACHE_TTL_SECONDS = {
  analytics: 15, // analytics cache is short-lived.
  couponsList: 60, // coupons list cache TTL.
  categoriesList: 45, // categories list cache TTL.
} as const;

/**
 * Get parsed cached JSON value by key, or null.
 */
export async function getAdminCachedJson<T>(key: string): Promise<T | null> {
  // thin wrapper keeps admin cache calls decoupled from generic Redis helpers.
  return getCachedJson<T>(key);
}

/**
 * Set admin cache JSON value with TTL.
 */
export async function setAdminCachedJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  // caller always provides TTL so cache freshness policy stays explicit.
  await setCachedJson(key, value, ttlSeconds);
}

/**
 * Remove analytics summary cache entry.
 */
export async function bustAdminAnalyticsCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.analyticsSummary]);
}

/**
 * Remove coupons list cache entry.
 */
export async function bustAdminCouponsListCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.couponsList]);
}

/**
 * Remove categories list cache entry.
 */
export async function bustAdminCategoriesListCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.categoriesList]);
}

/**
 * Remove analytics and categories list cache entries together.
 */
export async function bustAdminAnalyticsAndCategoriesCache(): Promise<void> {
  // common invalidation bundle applied after order/category side effects.
  await deleteCacheKeys([
    ADMIN_CACHE_KEYS.analyticsSummary,
    ADMIN_CACHE_KEYS.categoriesList,
  ]);
}
