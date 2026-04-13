import { getRedisClient } from "@/app/lib/redis";

/**
 * Simple fixed-window rate limit using Redis INCR.
 * If Redis is unavailable, allows the request (fail-open).
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<{ ok: boolean; remaining: number }> {
  const client = getRedisClient();
  if (!client) return { ok: true, remaining: max };

  try {
    if (!client.isOpen) await client.connect();
  } catch {
    return { ok: true, remaining: max };
  }

  const redisKey = `rl:${key}`;
  try {
    const n = await client.incr(redisKey);
    if (n === 1) {
      await client.expire(redisKey, windowSeconds);
    }
    return { ok: n <= max, remaining: Math.max(0, max - n) };
  } catch {
    return { ok: true, remaining: max };
  }
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
