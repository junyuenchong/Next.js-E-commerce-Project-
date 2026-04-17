// Feature: payment persistence helpers (idempotency, status transitions, audit history).
import type { PaymentProvider, PaymentStatus, Prisma } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import {
  deductStockOnPaid,
  shouldRestockForTransition,
} from "@/backend/core/stock-policy";

type CreatePayPalPaymentInput = {
  userId: number | null;
  idempotencyKey: string;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  expiresAt: Date;
  gatewayResponse?: Prisma.InputJsonValue;
};

function toJsonInput(value: Prisma.InputJsonValue | undefined) {
  return value;
}

// Creates (or reuses) one payment by provider+idempotencyKey to prevent duplicate charges.
export async function createOrReusePayPalPaymentRepo(
  input: CreatePayPalPaymentInput,
) {
  const existing = await prisma.payment.findUnique({
    where: {
      provider_idempotencyKey: {
        provider: "PAYPAL",
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (existing) return existing;

  return prisma.payment.create({
    data: {
      provider: "PAYPAL",
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      currency: input.currency,
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      expiresAt: input.expiresAt,
      status: "PENDING",
      ...(input.gatewayResponse !== undefined
        ? { gatewayResponse: input.gatewayResponse }
        : {}),
    },
  });
}

// Records status changes in append-only history for audit and support traceability.
export async function insertPaymentStatusHistoryRepo(params: {
  paymentId: number;
  fromStatus: PaymentStatus | null;
  toStatus: PaymentStatus;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.paymentStatusHistory.create({
    data: {
      paymentId: params.paymentId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      reason: params.reason ?? null,
      ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
    },
  });
}

// Moves payment to PROCESSING and stores gateway order id after create-order succeeds.
export async function markPaymentProcessingRepo(params: {
  paymentId: number;
  providerOrderId: string;
  gatewayResponse?: Prisma.InputJsonValue;
}) {
  const current = await prisma.payment.findUnique({
    where: { id: params.paymentId },
  });
  if (!current) return null;
  const next = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: "PROCESSING",
      providerOrderId: params.providerOrderId,
      gatewayResponse: toJsonInput(
        params.gatewayResponse ??
          (current.gatewayResponse as Prisma.InputJsonValue),
      ),
      version: { increment: 1 },
    },
  });
  if (current.status !== next.status) {
    await insertPaymentStatusHistoryRepo({
      paymentId: next.id,
      fromStatus: current.status,
      toStatus: next.status,
      reason: "paypal_order_created",
    });
  }
  return next;
}

export async function findPaymentByProviderOrderIdRepo(
  provider: PaymentProvider,
  providerOrderId: string,
) {
  return prisma.payment.findFirst({
    where: { provider, providerOrderId },
  });
}

// Marks payment as failed with a gateway response snapshot.
export async function markPaymentFailedRepo(params: {
  paymentId: number;
  reason: string;
  gatewayResponse?: Prisma.InputJsonValue;
}) {
  const current = await prisma.payment.findUnique({
    where: { id: params.paymentId },
  });
  if (!current) return null;
  const next = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: "FAILED",
      gatewayResponse: toJsonInput(
        params.gatewayResponse ??
          (current.gatewayResponse as Prisma.InputJsonValue),
      ),
      version: { increment: 1 },
    },
  });
  if (current.status !== next.status) {
    await insertPaymentStatusHistoryRepo({
      paymentId: next.id,
      fromStatus: current.status,
      toStatus: next.status,
      reason: params.reason,
      metadata: (params.gatewayResponse ?? null) as Prisma.InputJsonValue,
    });
  }
  return next;
}

// Marks payment as paid and links order/capture metadata.
export async function markPaymentPaidAndLinkOrderRepo(params: {
  paymentId: number;
  orderId: number;
  providerCaptureId: string | null;
  gatewayResponse?: Prisma.InputJsonValue;
}) {
  const current = await prisma.payment.findUnique({
    where: { id: params.paymentId },
  });
  if (!current) return null;
  const next = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: "PAID",
      orderId: params.orderId,
      providerCaptureId: params.providerCaptureId,
      gatewayResponse: toJsonInput(
        params.gatewayResponse ??
          (current.gatewayResponse as Prisma.InputJsonValue),
      ),
      version: { increment: 1 },
    },
  });
  if (current.status !== next.status) {
    await insertPaymentStatusHistoryRepo({
      paymentId: next.id,
      fromStatus: current.status,
      toStatus: next.status,
      reason: "paypal_capture_confirmed",
    });
  }
  return next;
}

export async function createWebhookInboxEventRepo(params: {
  provider: PaymentProvider;
  eventId: string;
  paymentId?: number | null;
  signatureVerified: boolean;
  payloadRaw: Prisma.InputJsonValue;
}) {
  const existing = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_eventId: { provider: params.provider, eventId: params.eventId },
    },
  });
  if (existing) return { created: false as const, row: existing };
  const row = await prisma.paymentWebhookEvent.create({
    data: {
      provider: params.provider,
      eventId: params.eventId,
      paymentId: params.paymentId ?? null,
      signatureVerified: params.signatureVerified,
      payloadRaw: params.payloadRaw,
    },
  });
  return { created: true as const, row };
}

export async function markWebhookHandledRepo(params: {
  webhookEventId: number;
  handleResult: string;
}) {
  await prisma.paymentWebhookEvent.update({
    where: { id: params.webhookEventId },
    data: {
      handledAt: new Date(),
      handleResult: params.handleResult,
    },
  });
}

export async function transitionPaymentStatusRepo(params: {
  paymentId: number;
  toStatus: PaymentStatus;
  reason: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const current = await prisma.payment.findUnique({
    where: { id: params.paymentId },
  });
  if (!current) return null;
  if (current.status === params.toStatus) return current;
  const next = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: params.toStatus,
      version: { increment: 1 },
      gatewayResponse: toJsonInput(
        params.metadata ?? (current.gatewayResponse as Prisma.InputJsonValue),
      ),
    },
  });
  await insertPaymentStatusHistoryRepo({
    paymentId: next.id,
    fromStatus: current.status,
    toStatus: params.toStatus,
    reason: params.reason,
    metadata: params.metadata,
  });
  return next;
}

// Cancels stale pending/processing payments after timeout window.
export async function cancelExpiredPaymentsRepo(now: Date) {
  const stale = await prisma.payment.findMany({
    where: {
      status: { in: ["PENDING", "PROCESSING"] },
      expiresAt: { lte: now },
    },
    select: { id: true, status: true, orderId: true },
    take: 500,
  });
  if (stale.length === 0) return { updated: 0 };

  await prisma.$transaction(async (tx) => {
    for (const payment of stale) {
      if (payment.status === "CANCELLED") continue;
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED", version: { increment: 1 } },
      });
      await tx.paymentStatusHistory.create({
        data: {
          paymentId: payment.id,
          fromStatus: payment.status,
          toStatus: "CANCELLED",
          reason: "payment_timeout",
        },
      });
      if (payment.orderId) {
        if (deductStockOnPaid()) {
          const orderForRestock = await tx.order.findUnique({
            where: { id: payment.orderId },
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
          where: { id: payment.orderId },
          data: { status: "cancelled" },
        });
      }
    }
  });
  return { updated: stale.length };
}
