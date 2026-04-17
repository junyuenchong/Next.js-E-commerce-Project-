/**
 * Admin HTTP route: events/products.
 */

import {
  createRedisSubscriber,
  ADMIN_SSE_CHANNELS,
} from "@/backend/modules/admin-events";
import { adminApiRequireCatalogAccess } from "@/backend/core/admin-api-guard";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Open an SSE stream for product-related admin events.
export async function GET(request: Request) {
  try {
    const guard = await adminApiRequireCatalogAccess();
    if (!guard.ok) return guard.response;

    const encoder = new TextEncoder();
    const channel = ADMIN_SSE_CHANNELS.products;
    const swallowError = (error: unknown) => {
      void error;
    };

    const stream = new ReadableStream({
      async start(controller) {
        const sendSseEvent = (obj: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
          );
        };

        const sendPing = () => {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        };

        const redisSub = await createRedisSubscriber();
        if (!redisSub) {
          sendSseEvent({
            type: "status",
            realtime: false,
            message:
              "REDIS_URL not set — realtime disabled (SSE heartbeats only).",
          });
          const iv = setInterval(sendPing, 25000);
          request.signal.addEventListener("abort", () => {
            clearInterval(iv);
            try {
              controller.close();
            } catch (error: unknown) {
              swallowError(error);
            }
          });
          return;
        }

        sendSseEvent({ type: "status", realtime: true, resource: "products" });

        const onRedisMessage = (message: string) => {
          try {
            sendSseEvent(JSON.parse(message));
          } catch (error: unknown) {
            swallowError(error);
            sendSseEvent({ type: "raw", raw: message });
          }
        };

        await redisSub.subscribe(channel, onRedisMessage);
        const pingIv = setInterval(sendPing, 25000);

        request.signal.addEventListener("abort", () => {
          clearInterval(pingIv);
          void (async () => {
            try {
              await redisSub.unsubscribe(channel);
              await redisSub.quit();
            } catch (error: unknown) {
              swallowError(error);
            }
            try {
              controller.close();
            } catch (error: unknown) {
              swallowError(error);
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
      "[admin/api/events/products GET]",
      "Failed to open products event stream",
    );
  }
}
