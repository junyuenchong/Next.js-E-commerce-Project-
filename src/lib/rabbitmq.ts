import amqp, { Channel } from "amqplib";

let channel: Channel | null = null;
let connecting = false;

async function getChannel(): Promise<Channel | null> {
  if (!process.env.RABBITMQ_URL) {
    // RabbitMQ is optional; if not configured just no-op
    return null;
  }

  if (channel) return channel;
  if (connecting) return channel;

  connecting = true;
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange("business.events", "topic", { durable: true });
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

export async function publishBusinessEvent(
  routingKey: string,
  payload: unknown,
) {
  try {
    const ch = await getChannel();
    if (!ch) return;

    const body = Buffer.from(JSON.stringify(payload));
    ch.publish("business.events", routingKey, body, {
      contentType: "application/json",
      persistent: true,
    });
  } catch (err: unknown) {
    console.error("[RabbitMQ] publishBusinessEvent error:", err);
  }
}
