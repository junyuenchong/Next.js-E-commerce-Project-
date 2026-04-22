import { NextResponse } from "next/server";
import {
  applyVerifiedPayPalWebhookEvent,
  type PayPalWebhookPayload,
  paypalVerifyWebhookSignature,
} from "@/backend/modules/payment";

// PayPal webhook endpoint: verify signature, dedupe event_id, then update payment state.
export async function POST(request: Request) {
  const startedAtMs = Date.now();
  const webhookPayload = (await request
    .json()
    .catch(() => null)) as PayPalWebhookPayload;
  if (
    !webhookPayload?.id ||
    !webhookPayload.event_type ||
    !webhookPayload.resource
  ) {
    return NextResponse.json(
      { error: "invalid_webhook_body" },
      { status: 400 },
    );
  }
  const signatureVerified = await paypalVerifyWebhookSignature({
    transmissionId: request.headers.get("paypal-transmission-id") ?? "",
    transmissionTime: request.headers.get("paypal-transmission-time") ?? "",
    certUrl: request.headers.get("paypal-cert-url") ?? "",
    authAlgo: request.headers.get("paypal-auth-algo") ?? "",
    transmissionSig: request.headers.get("paypal-transmission-sig") ?? "",
    webhookEvent: webhookPayload,
  });
  if (!signatureVerified) {
    return NextResponse.json(
      { error: "invalid_webhook_signature" },
      { status: 401 },
    );
  }

  const applyResult = await applyVerifiedPayPalWebhookEvent(webhookPayload);
  if (applyResult.status === "invalid_body") {
    return NextResponse.json(
      { error: "invalid_webhook_body" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    handledInMs: Date.now() - startedAtMs,
    eventType: applyResult.eventType ?? webhookPayload.event_type,
    status: applyResult.status,
  });
}
