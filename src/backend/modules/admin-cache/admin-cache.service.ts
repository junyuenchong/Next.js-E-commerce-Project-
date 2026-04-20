/**
 * admin cache service
 * handle admin cache service logic
 */
// provides cached admin datasets with consistent Redis key invalidation helpers.
import {
  deleteCacheKeys,
  getCachedJson,
  setCachedJson,
} from "@/backend/modules/db/redis";

// version for all admin cache keys.
const V = "v1";

// redis keys used for admin cache values.
export const ADMIN_CACHE_KEYS = {
  analyticsSummary: `admin:${V}:analytics:summary`, // analytics summary key.
  couponsList: `admin:${V}:coupons:list`, // admin coupons list key.
  categoriesList: `admin:${V}:categories:list`, // admin categories list key.
} as const;

// tTL policy for admin cache values (seconds).
export const ADMIN_CACHE_TTL_SECONDS = {
  analytics: 15, // analytics cache is short-lived.
  couponsList: 60, // coupons list cache TTL.
  categoriesList: 45, // categories list cache TTL.
} as const;

// get parsed cached JSON value by key, or null.
export async function getAdminCachedJson<T>(key: string): Promise<T | null> {
  // thin wrapper keeps admin cache calls decoupled from generic Redis helpers.
  return getCachedJson<T>(key);
}

// set admin cache JSON value with TTL.
export async function setAdminCachedJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  // caller always provides TTL so cache freshness policy stays explicit.
  await setCachedJson(key, value, ttlSeconds);
}

// remove analytics summary cache entry.
export async function bustAdminAnalyticsCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.analyticsSummary]);
}

// remove coupons list cache entry.
export async function bustAdminCouponsListCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.couponsList]);
}

// remove categories list cache entry.
export async function bustAdminCategoriesListCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.categoriesList]);
}

// remove analytics and categories list cache entries together.
export async function bustAdminAnalyticsAndCategoriesCache(): Promise<void> {
  // common invalidation bundle applied after order/category side effects.
  await deleteCacheKeys([
    ADMIN_CACHE_KEYS.analyticsSummary,
    ADMIN_CACHE_KEYS.categoriesList,
  ]);
}
