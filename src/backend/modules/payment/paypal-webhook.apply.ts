import prisma from "@/app/lib/prisma";
import type { PaymentStatus, Prisma } from "@prisma/client";
import {
  createWebhookInboxEventRepo,
  findPaymentByProviderOrderIdRepo,
  markWebhookHandledRepo,
} from "@/backend/modules/payment/payment.repo";
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

export type PayPalWebhookPayload = {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown>;
} | null;

/**
 * Apply a verified PayPal webhook event to local payment/order state.
 */
export async function applyVerifiedPayPalWebhookEvent(
  webhookPayload: PayPalWebhookPayload,
) {
  if (
    !webhookPayload?.id ||
    !webhookPayload.event_type ||
    !webhookPayload.resource
  ) {
    return { status: "invalid_body" as const };
  }

  const providerOrderId = providerOrderIdFromEvent(webhookPayload.resource);
  const paymentRecord = providerOrderId
    ? await findPaymentByProviderOrderIdRepo("PAYPAL", providerOrderId)
    : null;
  const inboxEvent = await createWebhookInboxEventRepo({
    provider: "PAYPAL",
    eventId: webhookPayload.id,
    paymentId: paymentRecord?.id ?? null,
    signatureVerified: true,
    payloadRaw: webhookPayload as unknown as Prisma.InputJsonValue,
  });
  // allow redelivered webhook to retry processing when previous attempt crashed before handledAt.
  if (!inboxEvent.created && inboxEvent.row.handledAt) {
    return {
      status: "duplicate" as const,
      eventType: webhookPayload.event_type,
    };
  }

  const nextStatus = statusFromPayPalEvent(webhookPayload.event_type);
  if (!paymentRecord || !nextStatus) {
    await markWebhookHandledRepo({
      webhookEventId: inboxEvent.row.id,
      handleResult: !paymentRecord
        ? `ignored_payment_not_found:${webhookPayload.event_type}`
        : `ignored_event_type:${webhookPayload.event_type}`,
    });
    return { status: "ignored" as const, eventType: webhookPayload.event_type };
  }

  const providerCaptureId = providerCaptureIdFromEvent(webhookPayload.resource);
  let createdOrderId: number | null = null;
  if (nextStatus === "PAID") {
    const existingOrderId = providerOrderId
      ? await getOrderIdByPayPalOrderIdService(providerOrderId)
      : null;
    if (existingOrderId != null) {
      createdOrderId = existingOrderId;
    } else {
      const snapshot = readCheckoutSnapshot(paymentRecord.gatewayResponse);
      if (snapshot) {
        try {
          const order = await createPaidOrderAfterCaptureService(
            {
              userId: paymentRecord.userId,
              emailSnapshot: null,
              currency: snapshot.currency,
              total: snapshot.total,
              paypalOrderId:
                providerOrderId ?? paymentRecord.providerOrderId ?? "",
              paypalCaptureId: providerCaptureIdFromEvent(
                webhookPayload.resource,
              ),
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
      where: { id: paymentRecord.id },
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
            providerCaptureId ?? current.providerCaptureId ?? undefined,
          ...(createdOrderId != null ? { orderId: createdOrderId } : {}),
          gatewayResponse: webhookPayload as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
      });
      await tx.paymentStatusHistory.create({
        data: {
          paymentId: current.id,
          fromStatus: current.status,
          toStatus: nextStatus,
          reason: `webhook:${webhookPayload.event_type}`,
          metadata: webhookPayload as unknown as Prisma.InputJsonValue,
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
      where: { id: inboxEvent.row.id },
      data: {
        handledAt: new Date(),
        handleResult: `applied:${webhookPayload.event_type}`,
      },
    });
  });

  return { status: "applied" as const, eventType: webhookPayload.event_type };
}
