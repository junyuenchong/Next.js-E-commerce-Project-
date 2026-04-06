import type { RedisClientType } from "redis";
import { getRedisClient } from "@/lib/redis";

export const ADMIN_SSE_CHANNELS = {
  products: "admin:sse:products",
  categories: "admin:sse:categories",
} as const;

async function ensureClient() {
  const client = getRedisClient();
  if (!client) return null;
  try {
    if (!client.isOpen) await client.connect();
  } catch {
    return null;
  }
  return client.isOpen ? client : null;
}

export async function publishAdminProductEvent(payload: {
  kind: "created" | "updated" | "deleted";
  id?: number;
}) {
  const client = await ensureClient();
  if (!client) return;
  try {
    await client.publish(
      ADMIN_SSE_CHANNELS.products,
      JSON.stringify({
        resource: "products",
        ...payload,
        at: Date.now(),
      }),
    );
  } catch (e) {
    console.error("[admin-events] publish products", e);
  }
}

export async function publishAdminCategoryEvent(payload: {
  kind: "created" | "updated" | "deleted";
  id?: number;
}) {
  const client = await ensureClient();
  if (!client) return;
  try {
    await client.publish(
      ADMIN_SSE_CHANNELS.categories,
      JSON.stringify({
        resource: "categories",
        ...payload,
        at: Date.now(),
      }),
    );
  } catch (e) {
    console.error("[admin-events] publish categories", e);
  }
}

/** Dedicated subscriber connection (required for pub/sub in node-redis). */
export async function createRedisSubscriber(): Promise<RedisClientType | null> {
  const main = await ensureClient();
  if (!main) return null;
  try {
    const sub = main.duplicate();
    await sub.connect();
    return sub;
  } catch (e) {
    console.error("[admin-events] subscriber failed", e);
    return null;
  }
}
