import amqp, { Channel } from "amqplib";

/**
 * PayPal capture → async fulfillment (queue-only, no exchanges).
 * - `order.email` — send receipt / transactional email (worker consumes + SMTP).
 * - `order.inventory` — decrement product stock (worker consumes + DB).
 *
 * Later (optional): add `order.payment`, `order.analytics` queues the same way.
 */

const DEFAULT_QUEUE_EMAIL = "order.email";
const DEFAULT_QUEUE_INVENTORY = "order.inventory";

let channel: Channel | null = null;
let connecting = false;

function queueEmail(): string {
  const q = process.env.RABBITMQ_QUEUE_ORDER_EMAIL?.trim();
  return q && q.length > 0 ? q : DEFAULT_QUEUE_EMAIL;
}

function queueInventory(): string {
  const q = process.env.RABBITMQ_QUEUE_ORDER_INVENTORY?.trim();
  return q && q.length > 0 ? q : DEFAULT_QUEUE_INVENTORY;
}

async function getChannel(): Promise<Channel | null> {
  if (!process.env.RABBITMQ_URL) {
    return null;
  }

  if (channel) return channel;
  if (connecting) return channel;

  connecting = true;
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue(queueEmail(), { durable: true });
    await ch.assertQueue(queueInventory(), { durable: true });
    channel = ch;

    conn.on("error", (err: unknown) => {
      console.error("[RabbitMQ] connection error:", err);
      channel = null;
    });

    conn.on("close", () => {
      console.warn("[RabbitMQ] connection closed");
      channel = null;
    });

    return ch;
  } catch (err: unknown) {
    console.error("[RabbitMQ] failed to connect:", err);
    channel = null;
    return null;
  } finally {
    connecting = false;
  }
}

function sendJson(queue: string, payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload));
  channel!.sendToQueue(queue, body, {
    persistent: true,
    contentType: "application/json",
  });
}

export type OrderEmailJobPayload = {
  v: 1;
  orderId: number;
  to: string;
  subject: string;
  text: string;
};

export type OrderInventoryJobPayload = {
  v: 1;
  orderId: number;
  lines: { productId: number; quantity: number }[];
};

/** Enqueue receipt email (consumer should call `sendTransactionalEmail` or equivalent). */
export async function enqueueOrderEmailJob(payload: OrderEmailJobPayload) {
  try {
    const ch = await getChannel();
    if (!ch) {
      if (process.env.RABBITMQ_URL) {
        throw new Error("[RabbitMQ] channel unavailable");
      }
      return;
    }
    sendJson(queueEmail(), payload as unknown as Record<string, unknown>);
  } catch (err: unknown) {
    console.error("[RabbitMQ] enqueueOrderEmailJob error:", err);
    throw err;
  }
}

/** Enqueue stock decrements (consumer should apply same logic as `decrementStockForOrderLinesRepo`). */
export async function enqueueOrderInventoryJob(
  payload: OrderInventoryJobPayload,
) {
  try {
    const ch = await getChannel();
    if (!ch) {
      if (process.env.RABBITMQ_URL) {
        throw new Error("[RabbitMQ] channel unavailable");
      }
      return;
    }
    sendJson(queueInventory(), payload as unknown as Record<string, unknown>);
  } catch (err: unknown) {
    console.error("[RabbitMQ] enqueueOrderInventoryJob error:", err);
    throw err;
  }
}
