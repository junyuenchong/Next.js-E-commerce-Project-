import amqp from "amqplib";
import { bustAdminAnalyticsCache } from "@/backend/modules/admin-cache";
import { publishAdminOrderEvent } from "@/backend/modules/admin-events";

// Feature: Analytics worker consumes analytics refresh jobs from RabbitMQ.
async function main() {
  const url = process.env.RABBITMQ_URL?.trim();
  if (!url) throw new Error("Missing RABBITMQ_URL");

  const queue =
    process.env.RABBITMQ_QUEUE_ORDER_ANALYTICS?.trim() || "order.analytics";

  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  await ch.assertQueue(queue, { durable: true });
  await ch.prefetch(10);

  console.log(`[worker/analytics] listening on queue ${queue}`);

  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const body = JSON.parse(msg.content.toString("utf8")) as {
        v: 1;
        orderId: number;
        status?: string;
      };
      await bustAdminAnalyticsCache();
      await publishAdminOrderEvent({
        kind: "updated",
        id: body.orderId,
        status: body.status,
      });
      ch.ack(msg);
    } catch (e) {
      console.error("[worker/analytics] job failed", e);
      ch.nack(msg, false, true);
    }
  });
}

void main();
