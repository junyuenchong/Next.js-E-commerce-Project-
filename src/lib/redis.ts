import { createClient, type RedisClientType } from "redis";

let redis: RedisClientType | null = null;

export function getRedisClient() {
  if (!process.env.REDIS_URL) {
    // Redis is optional – if not configured, just skip caching
    return null;
  }

  if (!redis) {
    redis = createClient({ url: process.env.REDIS_URL });

    redis.on("error", (err) => {
      console.error("[Redis] Error:", err);
    });

    // Connect in background
    redis.connect().catch((err) => {
      console.error("[Redis] Connect error:", err);
    });
  }

  return redis;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
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
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error("[Redis] setCachedJson error:", err);
  }
}

export async function deleteCacheKeys(keys: string[]) {
  const client = getRedisClient();
  if (!client || keys.length === 0) return;

  try {
    // redis v4 can accept string[]
    await client.del(keys);
  } catch (err) {
    console.error("[Redis] deleteCacheKeys error:", err);
  }
}
