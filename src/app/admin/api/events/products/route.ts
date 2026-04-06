import { createRedisSubscriber, ADMIN_SSE_CHANNELS } from "@/lib/admin-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const channel = ADMIN_SSE_CHANNELS.products;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      const ping = () => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      };

      const sub = await createRedisSubscriber();
      if (!sub) {
        send({
          type: "status",
          realtime: false,
          message:
            "REDIS_URL not set — realtime disabled (SSE heartbeats only).",
        });
        const iv = setInterval(ping, 25000);
        request.signal.addEventListener("abort", () => {
          clearInterval(iv);
          try {
            controller.close();
          } catch {
            /* ignore */
          }
        });
        return;
      }

      send({ type: "status", realtime: true, resource: "products" });

      const listener = (message: string) => {
        try {
          send(JSON.parse(message));
        } catch {
          send({ type: "raw", raw: message });
        }
      };

      await sub.subscribe(channel, listener);
      const pingIv = setInterval(ping, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(pingIv);
        void (async () => {
          try {
            await sub.unsubscribe(channel);
            await sub.quit();
          } catch {
            /* ignore */
          }
          try {
            controller.close();
          } catch {
            /* ignore */
          }
        })();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
