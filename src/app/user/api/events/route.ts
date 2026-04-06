import { ADMIN_SSE_CHANNELS, createRedisSubscriber } from "@/lib/admin-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseChannels(raw: string | null): string[] {
  if (!raw) return ["products", "categories"];
  const normalized = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function toRedisChannel(channel: string): string | null {
  if (channel === "products") return ADMIN_SSE_CHANNELS.products;
  if (channel === "categories") return ADMIN_SSE_CHANNELS.categories;
  return null;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const { searchParams } = new URL(request.url);
  const channels = parseChannels(searchParams.get("channels"));
  const redisChannels = channels
    .map(toRedisChannel)
    .filter((c): c is string => Boolean(c));

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      const ping = () => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      };

      const sub = await createRedisSubscriber();
      if (!sub || redisChannels.length === 0) {
        send({ type: "status", realtime: false });
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

      send({ type: "status", realtime: true, channels });

      const listener = (message: string) => {
        try {
          send(JSON.parse(message));
        } catch {
          send({ type: "raw", raw: message });
        }
      };

      await sub.subscribe(redisChannels, listener);
      const pingIv = setInterval(ping, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(pingIv);
        void (async () => {
          try {
            await sub.unsubscribe(redisChannels);
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
