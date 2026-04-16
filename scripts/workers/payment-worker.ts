import amqp from "amqplib";
import { decrementStockForOrderLinesService } from "@/backend/modules/order/order.service";

// Feature: Payment worker consumes payment jobs from RabbitMQ.
async function main() {
  const url = process.env.RABBITMQ_URL?.trim();
  if (!url) throw new Error("Missing RABBITMQ_URL");

  const queue =
    process.env.RABBITMQ_QUEUE_ORDER_PAYMENT?.trim() ||
    process.env.RABBITMQ_QUEUE_ORDER_INVENTORY?.trim() ||
    "order.payment";

  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  await ch.assertQueue(queue, { durable: true });
  await ch.prefetch(10);

  console.log(`[worker/payment] listening on queue ${queue}`);

  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const body = JSON.parse(msg.content.toString("utf8")) as {
        v: 1;
        orderId: number;
        lines: { productId: number; quantity: number }[];
      };
      await decrementStockForOrderLinesService(body.lines);
      ch.ack(msg);
    } catch (e) {
      console.error("[worker/payment] job failed", e);
      ch.nack(msg, false, true);
    }
  });
}

void main();
