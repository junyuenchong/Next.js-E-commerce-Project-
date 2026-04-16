// Feature: Redis utilities for JSON cache get/set/delete and key patterns.
import { createClient, type RedisClientType } from "redis";
import {
  logErrorWithContext,
  runSafely,
  runSafelyVoid,
} from "@/backend/shared/async-safety";

let redis: RedisClientType | null = null;

export function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    redis = createClient({ url: process.env.REDIS_URL });
    redis.on("error", (err) => {
      console.error("[Redis] Error:", err);
    });
    redis.connect().catch((err) => {
      console.error("[Redis] Connect error:", err);
    });
  }
  return redis;
}

// Guard: ensure Redis is connected and return client (or null).
async function ensureRedisConnected(): Promise<RedisClientType | null> {
  const client = getRedisClient();
  if (!client) return null;
  try {
    if (!client.isOpen) await client.connect();
  } catch {
    return null;
  }
  return client.isOpen ? client : null;
}

// Feature: get JSON value from Redis cache.
export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = await ensureRedisConnected();
  if (!client) return null;
  return runSafely(
    async () => {
      const cached = await client.get(key);
      if (!cached) return null;
      return JSON.parse(cached) as T;
    },
    (err) => {
      logErrorWithContext("[Redis] getCachedJson error:", err);
      return null;
    },
  );
}

// Feature: set JSON value in Redis with TTL (default 5 minutes).
export async function setCachedJson(
  key: string,
  value: unknown,
  ttlSeconds = 300,
) {
  const client = await ensureRedisConnected();
  if (!client) return;
  await runSafelyVoid(async () => {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }, "[Redis] setCachedJson error:");
}

// Feature: delete one or more explicit cache keys.
export async function deleteCacheKeys(keys: string[]) {
  const client = await ensureRedisConnected();
  if (!client || keys.length === 0) return;
  await runSafelyVoid(async () => {
    await client.del(keys);
  }, "[Redis] deleteCacheKeys error:");
}

// Feature: delete cache keys that match a pattern.
export async function deleteCacheKeysByPattern(pattern: string) {
  const client = await ensureRedisConnected();
  if (!client) return;

  const batch: string[] = [];
  const flush = async () => {
    if (batch.length === 0) return;
    await runSafelyVoid(async () => {
      await client.del(batch);
    }, "[Redis] deleteCacheKeysByPattern del batch:");
    batch.length = 0;
  };

  await runSafelyVoid(async () => {
    for await (const key of client.scanIterator({
      MATCH: pattern,
      COUNT: 200,
    })) {
      batch.push(key);
      if (batch.length >= 200) await flush();
    }
    await flush();
  }, "[Redis] deleteCacheKeysByPattern error:");
}

// Note: shared cache key helper functions.
export const cacheKeys = {
  productsList: (take: number, page: number) => `products:list:${take}:${page}`,
  productListPattern: () => "products:list:*",
  productById: (id: number) => `product:id:${id}`,
  productBySlug: (slug: string) => `product:slug:${slug}`,
  categoriesAll: () => `categories:all`,
  categoryBySlug: (slug: string) => `category:slug:${slug}`,
  productsByCategory: (slug: string, take: number | "all", page: number) =>
    `products:by-category:${slug}:${take}:${page}`,
  productsByCategoryPattern: (slug: string) => `products:by-category:${slug}:*`,
  productsByCategoryAllPattern: () => "products:by-category:*",
} as const;
