import {
  createRedisSubscriber,
  ADMIN_SSE_CHANNELS,
} from "@/backend/modules/admin-events";
import { adminApiRequireCatalogAccess } from "@/backend/core/admin-api-guard";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const g = await adminApiRequireCatalogAccess();
    if (!g.ok) return g.response;

    const encoder = new TextEncoder();
    const channel = ADMIN_SSE_CHANNELS.categories;
    const ignoreError = (error: unknown) => {
      void error;
    };

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
          );
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
            } catch (error: unknown) {
              ignoreError(error);
            }
          });
          return;
        }

        send({ type: "status", realtime: true, resource: "categories" });

        const listener = (message: string) => {
          try {
            send(JSON.parse(message));
          } catch (error: unknown) {
            ignoreError(error);
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
            } catch (error: unknown) {
              ignoreError(error);
            }
            try {
              controller.close();
            } catch (error: unknown) {
              ignoreError(error);
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
  } catch (error) {
    return jsonInternalServerError(
      error,
      "[admin/api/events/categories GET]",
      "Failed to open categories event stream",
    );
  }
}
