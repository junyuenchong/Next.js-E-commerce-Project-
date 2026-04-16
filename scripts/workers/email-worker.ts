import amqp from "amqplib";
import { sendTransactionalEmail } from "@/backend/modules/notification";

// Feature: Email worker consumes email jobs from RabbitMQ.
async function main() {
  const url = process.env.RABBITMQ_URL?.trim();
  if (!url) throw new Error("Missing RABBITMQ_URL");

  const queue = process.env.RABBITMQ_QUEUE_ORDER_EMAIL?.trim() || "order.email";

  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  await ch.assertQueue(queue, { durable: true });
  await ch.prefetch(10);

  console.log(`[worker/email] listening on queue ${queue}`);

  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const body = JSON.parse(msg.content.toString("utf8")) as {
        v: 1;
        orderId: number;
        to: string;
        subject: string;
        text: string;
      };
      await sendTransactionalEmail({
        to: body.to,
        subject: body.subject,
        text: body.text,
      });
      ch.ack(msg);
    } catch (e) {
      console.error("[worker/email] job failed", e);
      ch.nack(msg, false, true);
    }
  });
}

void main();
