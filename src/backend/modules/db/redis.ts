import { createClient, type RedisClientType } from "redis";

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

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = await ensureRedisConnected();
  if (!client) return null;
  try {
    const cached = await client.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (err) {
    console.error("[Redis] getCachedJson error:", err);
    return null;
  }
}

export async function setCachedJson(
  key: string,
  value: unknown,
  ttlSeconds = 300,
) {
  const client = await ensureRedisConnected();
  if (!client) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error("[Redis] setCachedJson error:", err);
  }
}

export async function deleteCacheKeys(keys: string[]) {
  const client = await ensureRedisConnected();
  if (!client || keys.length === 0) return;
  try {
    await client.del(keys);
  } catch (err) {
    console.error("[Redis] deleteCacheKeys error:", err);
  }
}

export async function deleteCacheKeysByPattern(pattern: string) {
  const client = await ensureRedisConnected();
  if (!client) return;

  const batch: string[] = [];
  const flush = async () => {
    if (batch.length === 0) return;
    try {
      await client.del(batch);
    } catch (err) {
      console.error("[Redis] deleteCacheKeysByPattern del batch:", err);
    }
    batch.length = 0;
  };

  try {
    for await (const key of client.scanIterator({
      MATCH: pattern,
      COUNT: 200,
    })) {
      batch.push(key);
      if (batch.length >= 200) await flush();
    }
    await flush();
  } catch (err) {
    console.error("[Redis] deleteCacheKeysByPattern error:", err);
  }
}

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
