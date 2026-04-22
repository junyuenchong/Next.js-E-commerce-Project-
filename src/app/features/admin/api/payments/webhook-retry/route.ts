import { NextResponse } from "next/server";
import {
  applyVerifiedPayPalWebhookEvent,
  listUnhandledWebhookEventsRepo,
  markWebhookHandledRepo,
} from "@/backend/modules/payment";

const DEFAULT_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.PAYMENT_WEBHOOK_RETRY_LIMIT ?? "50", 10) || 50,
);

// cron endpoint: retry unhandled webhook events for eventual consistency.
export async function POST(request: Request) {
  const startedAtMs = Date.now();
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (expectedSecret) {
    const providedSecret = request.headers.get("x-cron-secret")?.trim();
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const unhandledEvents = await listUnhandledWebhookEventsRepo({
    provider: "PAYPAL",
    limit: DEFAULT_LIMIT,
  });
  let retried = 0;
  let applied = 0;
  let ignored = 0;
  let duplicates = 0;
  let failed = 0;

  for (const webhookEvent of unhandledEvents) {
    retried += 1;
    // replay already-verified payload from webhook inbox.
    const applyResult = await applyVerifiedPayPalWebhookEvent(
      webhookEvent.payloadRaw as {
        id?: string;
        event_type?: string;
        resource?: Record<string, unknown>;
      },
    ).catch(() => ({ status: "failed" as const }));

    if (applyResult.status === "applied") applied += 1;
    else if (applyResult.status === "ignored") ignored += 1;
    else if (applyResult.status === "duplicate") duplicates += 1;
    else failed += 1;

    if (applyResult.status === "invalid_body") {
      // mark malformed payload as handled so cron does not loop forever.
      await markWebhookHandledRepo({
        webhookEventId: webhookEvent.id,
        handleResult: "retry_failed:invalid_body",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    retried,
    applied,
    ignored,
    duplicate: duplicates,
    failed,
    handledInMs: Date.now() - startedAtMs,
  });
}
