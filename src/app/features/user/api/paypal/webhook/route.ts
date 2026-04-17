import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  createWebhookInboxEventRepo,
  findPaymentByProviderOrderIdRepo,
  markWebhookHandledRepo,
  paypalVerifyWebhookSignature,
} from "@/backend/modules/payment";
import type { PaymentStatus } from "@prisma/client";
import {
  createPaidOrderAfterCaptureService,
  getOrderIdByPayPalOrderIdService,
} from "@/backend/modules/order";
import {
  deductStockOnPaid,
  shouldRestockForTransition,
} from "@/backend/core/stock-policy";

function statusFromPayPalEvent(eventType: string): PaymentStatus | null {
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") return "PAID";
  if (eventType === "PAYMENT.CAPTURE.DENIED") return "FAILED";
  if (eventType === "PAYMENT.CAPTURE.REFUNDED") return "REFUNDED";
  if (eventType === "CHECKOUT.ORDER.VOIDED") return "CANCELLED";
  return null;
}

function providerOrderIdFromEvent(
  resource: Record<string, unknown>,
): string | null {
  const supplementary = resource.supplementary_data as
    | {
        related_ids?: { order_id?: string };
      }
    | undefined;
  const orderId = supplementary?.related_ids?.order_id;
  if (typeof orderId === "string" && orderId.trim()) return orderId.trim();

  const id = resource.id;
  if (typeof id === "string" && id.startsWith("O-")) return id;
  return null;
}

function providerCaptureIdFromEvent(
  resource: Record<string, unknown>,
): string | null {
  const id = resource.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  return null;
}

type CheckoutSnapshot = {
  lines: Array<{
    productId: number;
    quantity: number;
    title: string;
    unitPrice: number;
    imageUrl: string | null;
  }>;
  couponId: number | null;
  couponCodeSnapshot: string | null;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
};

function readCheckoutSnapshot(value: unknown): CheckoutSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const container = value as { checkoutSnapshot?: unknown };
  if (
    !container.checkoutSnapshot ||
    typeof container.checkoutSnapshot !== "object"
  ) {
    return null;
  }
  const snapshot = container.checkoutSnapshot as CheckoutSnapshot;
  if (!Array.isArray(snapshot.lines) || !snapshot.currency) return null;
  return snapshot;
}

// PayPal webhook endpoint: verify signature, dedupe event_id, then update payment state.
export async function POST(request: Request) {
  const startedAtMs = Date.now();
  const payload = (await request.json().catch(() => null)) as {
    id?: string;
    event_type?: string;
    resource?: Record<string, unknown>;
  } | null;
  if (!payload?.id || !payload.event_type || !payload.resource) {
    return NextResponse.json(
      { error: "invalid_webhook_body" },
      { status: 400 },
    );
  }

  const verified = await paypalVerifyWebhookSignature({
    transmissionId: request.headers.get("paypal-transmission-id") ?? "",
    transmissionTime: request.headers.get("paypal-transmission-time") ?? "",
    certUrl: request.headers.get("paypal-cert-url") ?? "",
    authAlgo: request.headers.get("paypal-auth-algo") ?? "",
    transmissionSig: request.headers.get("paypal-transmission-sig") ?? "",
    webhookEvent: payload,
  });
  if (!verified) {
    return NextResponse.json(
      { error: "invalid_webhook_signature" },
      { status: 401 },
    );
  }

  const providerOrderId = providerOrderIdFromEvent(payload.resource);
  const payment = providerOrderId
    ? await findPaymentByProviderOrderIdRepo("PAYPAL", providerOrderId)
    : null;
  const inbox = await createWebhookInboxEventRepo({
    provider: "PAYPAL",
    eventId: payload.id,
    paymentId: payment?.id ?? null,
    signatureVerified: true,
    payloadRaw: payload as unknown as Prisma.InputJsonValue,
  });
  if (!inbox.created) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const nextStatus = statusFromPayPalEvent(payload.event_type);
  if (!payment || !nextStatus) {
    await markWebhookHandledRepo({
      webhookEventId: inbox.row.id,
      handleResult: !payment
        ? `ignored_payment_not_found:${payload.event_type}`
        : `ignored_event_type:${payload.event_type}`,
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const captureId = providerCaptureIdFromEvent(payload.resource);
  let createdOrderId: number | null = null;
  if (nextStatus === "PAID") {
    const existingOrderId = providerOrderId
      ? await getOrderIdByPayPalOrderIdService(providerOrderId)
      : null;
    if (existingOrderId != null) {
      createdOrderId = existingOrderId;
    } else {
      const snapshot = readCheckoutSnapshot(payment.gatewayResponse);
      if (snapshot) {
        try {
          const order = await createPaidOrderAfterCaptureService(
            {
              userId: payment.userId,
              emailSnapshot: null,
              currency: snapshot.currency,
              total: snapshot.total,
              paypalOrderId: providerOrderId ?? payment.providerOrderId ?? "",
              paypalCaptureId: providerCaptureIdFromEvent(payload.resource),
              lines: snapshot.lines,
              couponId: snapshot.couponId,
              couponCodeSnapshot: snapshot.couponCodeSnapshot,
              discountAmount: snapshot.discount,
            },
            { skipStockDecrement: !deductStockOnPaid() },
          );
          createdOrderId = order.id;
        } catch {
          // Duplicate order race is safe: lookup below will resolve existing row.
          if (providerOrderId) {
            createdOrderId =
              await getOrderIdByPayPalOrderIdService(providerOrderId);
          }
        }
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.payment.findUnique({
      where: { id: payment.id },
      select: {
        id: true,
        status: true,
        orderId: true,
        providerCaptureId: true,
      },
    });
    if (!current) return;

    if (current.status !== nextStatus) {
      await tx.payment.update({
        where: { id: current.id },
        data: {
          status: nextStatus,
          providerCaptureId:
            captureId ?? current.providerCaptureId ?? undefined,
          ...(createdOrderId != null ? { orderId: createdOrderId } : {}),
          gatewayResponse: payload as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      await tx.paymentStatusHistory.create({
        data: {
          paymentId: current.id,
          fromStatus: current.status,
          toStatus: nextStatus,
          reason: `webhook:${payload.event_type}`,
          metadata: payload as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const effectiveOrderId = current.orderId ?? createdOrderId;
    if (effectiveOrderId) {
      const orderStatus =
        nextStatus === "PAID"
          ? "paid"
          : nextStatus === "CANCELLED" || nextStatus === "REFUNDED"
            ? "cancelled"
            : null;
      if (orderStatus) {
        if (orderStatus === "cancelled" && deductStockOnPaid()) {
          const orderForRestock = await tx.order.findUnique({
            where: { id: effectiveOrderId },
            select: {
              status: true,
              items: {
                select: { productId: true, quantity: true },
                orderBy: { id: "asc" },
              },
            },
          });
          if (
            orderForRestock &&
            shouldRestockForTransition(orderForRestock.status, "cancelled")
          ) {
            await Promise.all(
              orderForRestock.items.map((line) =>
                tx.product.update({
                  where: { id: line.productId },
                  data: { stock: { increment: line.quantity } },
                }),
              ),
            );
          }
        }
        await tx.order.update({
          where: { id: effectiveOrderId },
          data: { status: orderStatus },
        });
      }
    }

    await tx.paymentWebhookEvent.update({
      where: { id: inbox.row.id },
      data: {
        handledAt: new Date(),
        handleResult: `applied:${payload.event_type}`,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    handledInMs: Date.now() - startedAtMs,
    eventType: payload.event_type,
  });
}
