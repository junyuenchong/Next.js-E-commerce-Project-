// Feature: Publishes order-related background jobs to RabbitMQ queues for async processing.
import amqp, { Channel } from "amqplib";
import { runSafely } from "@/backend/shared/async-safety";

// Note: default queue names when env overrides are absent.
const DEFAULT_QUEUE_EMAIL = "order.email";
const DEFAULT_QUEUE_PAYMENT = "order.payment";
const DEFAULT_QUEUE_ANALYTICS = "order.analytics";

let channel: Channel | null = null;
let connecting = false;

// Feature: resolve email queue name from env or default.
function queueEmail(): string {
  const q = process.env.RABBITMQ_QUEUE_ORDER_EMAIL?.trim();
  return q && q.length > 0 ? q : DEFAULT_QUEUE_EMAIL;
}

// Feature: resolve payment queue name from env or default.
function queuePayment(): string {
  const q = process.env.RABBITMQ_QUEUE_ORDER_PAYMENT?.trim();
  return q && q.length > 0 ? q : DEFAULT_QUEUE_PAYMENT;
}

// Feature: resolve analytics queue name from env or default.
function queueAnalytics(): string {
  const q = process.env.RABBITMQ_QUEUE_ORDER_ANALYTICS?.trim();
  return q && q.length > 0 ? q : DEFAULT_QUEUE_ANALYTICS;
}

// Feature: shared RabbitMQ channel bootstrap with reconnect safety hooks.
async function getChannel(): Promise<Channel | null> {
  if (!process.env.RABBITMQ_URL) return null;
  if (channel) return channel;
  if (connecting) return channel;

  connecting = true;
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue(queueEmail(), { durable: true });
    await ch.assertQueue(queuePayment(), { durable: true });
    await ch.assertQueue(queueAnalytics(), { durable: true });
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

// Note: queue payloads are always persisted JSON for background workers.
function sendJson(queue: string, payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload));
  channel!.sendToQueue(queue, body, {
    persistent: true,
    contentType: "application/json",
  });
}

// Note: email job payload shape.
export type OrderEmailJobPayload = {
  v: 1;
  orderId: number;
  to: string;
  subject: string;
  text: string;
};

// Note: payment job payload shape.
export type OrderPaymentJobPayload = {
  v: 1;
  orderId: number;
  lines: { productId: number; quantity: number }[];
};

// Note: analytics job payload shape.
export type OrderAnalyticsJobPayload = {
  v: 1;
  orderId: number;
  status?: "paid" | "processing" | "shipped" | "delivered" | "cancelled";
};

// Feature: enqueue email job.
export async function enqueueOrderEmailJob(payload: OrderEmailJobPayload) {
  // Guard: fail hard only when MQ is configured but unreachable.
  return runSafely(
    async () => {
      const ch = await getChannel();
      if (!ch) {
        if (process.env.RABBITMQ_URL) {
          throw new Error("[RabbitMQ] channel unavailable");
        }
        return;
      }
      sendJson(queueEmail(), payload as unknown as Record<string, unknown>);
    },
    (err: unknown) => {
      console.error("[RabbitMQ] enqueueOrderEmailJob error:", err);
      throw err;
    },
  );
}

// Feature: enqueue payment job.
export async function enqueueOrderPaymentJob(payload: OrderPaymentJobPayload) {
  // Feature: payment-side effects are offloaded to worker pipeline via queue.
  return runSafely(
    async () => {
      const ch = await getChannel();
      if (!ch) {
        if (process.env.RABBITMQ_URL) {
          throw new Error("[RabbitMQ] channel unavailable");
        }
        return;
      }
      sendJson(queuePayment(), payload as unknown as Record<string, unknown>);
    },
    (err: unknown) => {
      console.error("[RabbitMQ] enqueueOrderPaymentJob error:", err);
      throw err;
    },
  );
}

// Feature: enqueue analytics job.
export async function enqueueOrderAnalyticsJob(
  payload: OrderAnalyticsJobPayload,
) {
  // Feature: analytics refresh is offloaded to worker pipeline via queue.
  return runSafely(
    async () => {
      const ch = await getChannel();
      if (!ch) {
        if (process.env.RABBITMQ_URL) {
          throw new Error("[RabbitMQ] channel unavailable");
        }
        return;
      }
      sendJson(queueAnalytics(), payload as unknown as Record<string, unknown>);
    },
    (err: unknown) => {
      console.error("[RabbitMQ] enqueueOrderAnalyticsJob error:", err);
      throw err;
    },
  );
}
