// Feature: Provides cached admin datasets with consistent Redis key invalidation helpers.
import {
  deleteCacheKeys,
  getCachedJson,
  setCachedJson,
} from "@/backend/modules/db/redis";

// Note: version for all admin cache keys.
const V = "v1";

// Note: Redis keys used for admin cache values.
export const ADMIN_CACHE_KEYS = {
  analyticsSummary: `admin:${V}:analytics:summary`, // Note: analytics summary key.
  couponsList: `admin:${V}:coupons:list`, // Note: admin coupons list key.
  categoriesList: `admin:${V}:categories:list`, // Note: admin categories list key.
} as const;

// Note: TTL policy for admin cache values (seconds).
export const ADMIN_CACHE_TTL_SECONDS = {
  analytics: 15, // Note: analytics cache is short-lived.
  couponsList: 60, // Note: coupons list cache TTL.
  categoriesList: 45, // Note: categories list cache TTL.
} as const;

// Feature: get parsed cached JSON value by key, or null.
export async function getAdminCachedJson<T>(key: string): Promise<T | null> {
  // Note: thin wrapper keeps admin cache calls decoupled from generic Redis helpers.
  return getCachedJson<T>(key);
}

// Feature: set admin cache JSON value with TTL.
export async function setAdminCachedJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  // Note: caller always provides TTL so cache freshness policy stays explicit.
  await setCachedJson(key, value, ttlSeconds);
}

// Feature: remove analytics summary cache entry.
export async function bustAdminAnalyticsCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.analyticsSummary]);
}

// Feature: remove coupons list cache entry.
export async function bustAdminCouponsListCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.couponsList]);
}

// Feature: remove categories list cache entry.
export async function bustAdminCategoriesListCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.categoriesList]);
}

// Feature: remove analytics and categories list cache entries together.
export async function bustAdminAnalyticsAndCategoriesCache(): Promise<void> {
  // Note: common invalidation bundle applied after order/category side effects.
  await deleteCacheKeys([
    ADMIN_CACHE_KEYS.analyticsSummary,
    ADMIN_CACHE_KEYS.categoriesList,
  ]);
}
