/**
 * admin events service
 * handle admin events service logic
 */
// publishes admin SSE event payloads to Redis channels for dashboard live updates.
import type { RedisClientType } from "redis";
import { getRedisClient } from "@/backend/modules/db/redis";
import {
  logErrorWithContext,
  runSafely,
  runSafelyVoid,
} from "@/backend/shared/async-safety";

// redis channel names used for admin SSE events.
export const ADMIN_SSE_CHANNELS = {
  products: "admin:sse:products",
  categories: "admin:sse:categories",
  orders: "admin:sse:orders",
} as const;

// ensure Redis client is available and open.
async function ensureClient() {
  // shared connector keeps publisher/subscriber readiness checks aligned.
  const client = getRedisClient();
  if (!client) return null;
  await runSafelyVoid(async () => {
    if (!client.isOpen) await client.connect();
  }, "[admin-events] ensure client failed");
  return client.isOpen ? client : null;
}

// publish product event to products SSE channel.
export async function publishAdminProductEvent(payload: {
  kind: "created" | "updated" | "deleted";
  id?: number;
}) {
  const client = await ensureClient();
  if (!client) return;
  // publish is best-effort; failures are logged and do not block mutations.
  await runSafelyVoid(async () => {
    await client.publish(
      ADMIN_SSE_CHANNELS.products,
      JSON.stringify({
        resource: "products",
        ...payload,
        at: Date.now(),
      }),
    );
  }, "[admin-events] publish products");
}

// publish category event to categories SSE channel.
export async function publishAdminCategoryEvent(payload: {
  kind: "created" | "updated" | "deleted";
  id?: number;
}) {
  const client = await ensureClient();
  if (!client) return;
  // category events drive admin list refresh and live dashboard updates.
  await runSafelyVoid(async () => {
    await client.publish(
      ADMIN_SSE_CHANNELS.categories,
      JSON.stringify({
        resource: "categories",
        ...payload,
        at: Date.now(),
      }),
    );
  }, "[admin-events] publish categories");
}

// publish order event to orders SSE channel.
export async function publishAdminOrderEvent(payload: {
  kind: "updated";
  id: number;
  status?: string;
}) {
  const client = await ensureClient();
  if (!client) return;
  // emit order events after status/shipment changes for realtime admin UI.
  await runSafelyVoid(async () => {
    await client.publish(
      ADMIN_SSE_CHANNELS.orders,
      JSON.stringify({
        resource: "orders",
        ...payload,
        at: Date.now(),
      }),
    );
  }, "[admin-events] publish orders");
}

// create Redis subscriber client for event listening.
export async function createRedisSubscriber(): Promise<RedisClientType | null> {
  const main = await ensureClient();
  if (!main) return null;
  // duplicate connection avoids blocking publisher traffic with subscriber flow.
  return runSafely(
    async () => {
      const sub = main.duplicate();
      await sub.connect();
      return sub;
    },
    (error) => {
      logErrorWithContext("[admin-events] subscriber failed", error);
      return null;
    },
  );
}
