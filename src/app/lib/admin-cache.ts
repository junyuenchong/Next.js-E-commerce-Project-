/** Redis keys + TTL for admin list/analytics caches (optional REDIS_URL). */
import { deleteCacheKeys, getCachedJson, setCachedJson } from "@/app/lib/redis";

const V = "v1";

export const ADMIN_CACHE_KEYS = {
  analyticsSummary: `admin:${V}:analytics:summary`,
  couponsList: `admin:${V}:coupons:list`,
  categoriesList: `admin:${V}:categories:list`,
} as const;

export const ADMIN_CACHE_TTL_SECONDS = {
  analytics: 15,
  couponsList: 60,
  categoriesList: 45,
} as const;

export async function getAdminCachedJson<T>(key: string): Promise<T | null> {
  return getCachedJson<T>(key);
}

export async function setAdminCachedJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  await setCachedJson(key, value, ttlSeconds);
}

export async function bustAdminAnalyticsCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.analyticsSummary]);
}

export async function bustAdminCouponsListCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.couponsList]);
}

export async function bustAdminCategoriesListCache(): Promise<void> {
  await deleteCacheKeys([ADMIN_CACHE_KEYS.categoriesList]);
}

/** Bust analytics + categories after catalog/order changes that affect counts. */
export async function bustAdminAnalyticsAndCategoriesCache(): Promise<void> {
  await deleteCacheKeys([
    ADMIN_CACHE_KEYS.analyticsSummary,
    ADMIN_CACHE_KEYS.categoriesList,
  ]);
}
