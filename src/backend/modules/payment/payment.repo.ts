// payment persistence helpers (idempotency, status transitions, audit history).
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

const ALLOWED_PAYMENT_STATUS_TRANSITIONS: Record<
  PaymentStatus,
  readonly PaymentStatus[]
> = {
  PENDING: ["PROCESSING", "FAILED", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED", "CANCELLED"],
  PAID: ["REFUNDED"],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};

function toJsonInput(value: Prisma.InputJsonValue | undefined) {
  return value;
}

// state-machine guard to prevent invalid status jumps.
function canTransitionPaymentStatus(
  fromStatus: PaymentStatus,
  toStatus: PaymentStatus,
): boolean {
  if (fromStatus === toStatus) return true;
  return ALLOWED_PAYMENT_STATUS_TRANSITIONS[fromStatus].includes(toStatus);
}

/**
 * Handles create or reuse pay pal payment repo.
 */
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

/**
 * Handles insert payment status history repo.
 */
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

/**
 * Handles mark payment processing repo.
 */
export async function markPaymentProcessingRepo(params: {
  paymentId: number;
  providerOrderId: string;
  orderId?: number | null;
  gatewayResponse?: Prisma.InputJsonValue;
}) {
  const current = await prisma.payment.findUnique({
    where: { id: params.paymentId },
  });
  if (!current) return null;
  if (!canTransitionPaymentStatus(current.status, "PROCESSING")) {
    return current;
  }
  const next = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: "PROCESSING",
      providerOrderId: params.providerOrderId,
      ...(params.orderId != null ? { orderId: params.orderId } : {}),
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

/**
 * Handles find payment by provider order id repo.
 */
export async function findPaymentByProviderOrderIdRepo(
  provider: PaymentProvider,
  providerOrderId: string,
) {
  return prisma.payment.findFirst({
    where: { provider, providerOrderId },
  });
}

/**
 * Handles reserve payment for capture repo.
 */
export async function reservePaymentForCaptureRepo(params: {
  paymentId: number;
  reason?: string;
}) {
  // use version-based update (optimistic lock) to avoid double capture.
  const current = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    select: { id: true, status: true, version: true },
  });
  if (!current) return { ok: false as const, reason: "payment_not_found" };
  if (current.status === "PAID")
    return { ok: false as const, reason: "already_paid" };
  if (
    current.status === "CANCELLED" ||
    current.status === "FAILED" ||
    current.status === "REFUNDED"
  ) {
    return { ok: false as const, reason: "payment_terminal_status" };
  }

  const updated = await prisma.payment.updateMany({
    where: {
      id: current.id,
      version: current.version,
      status: { in: ["PENDING", "PROCESSING"] },
    },
    data: {
      status: "PROCESSING",
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    return { ok: false as const, reason: "concurrent_capture_in_progress" };
  }

  if (current.status !== "PROCESSING") {
    await insertPaymentStatusHistoryRepo({
      paymentId: current.id,
      fromStatus: current.status,
      toStatus: "PROCESSING",
      reason: params.reason ?? "capture_attempt_started",
    });
  }
  return { ok: true as const };
}

/**
 * Handles mark payment failed repo.
 */
export async function markPaymentFailedRepo(params: {
  paymentId: number;
  reason: string;
  gatewayResponse?: Prisma.InputJsonValue;
}) {
  const current = await prisma.payment.findUnique({
    where: { id: params.paymentId },
  });
  if (!current) return null;
  if (!canTransitionPaymentStatus(current.status, "FAILED")) {
    return current;
  }
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

/**
 * Handles mark payment paid and link order repo.
 */
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
  if (!canTransitionPaymentStatus(current.status, "PAID")) {
    return current;
  }
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

/**
 * Handles create webhook inbox event repo.
 */
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

/**
 * Handles mark webhook handled repo.
 */
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

/**
 * Handles list unhandled webhook events repo.
 */
export async function listUnhandledWebhookEventsRepo(params?: {
  provider?: PaymentProvider;
  limit?: number;
}) {
  // oldest-first replay so backlog drains in a deterministic order.
  return prisma.paymentWebhookEvent.findMany({
    where: {
      handledAt: null,
      ...(params?.provider ? { provider: params.provider } : {}),
    },
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
    take: Math.max(1, Math.min(params?.limit ?? 100, 500)),
  });
}

/**
 * Handles transition payment status repo.
 */
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
  if (!canTransitionPaymentStatus(current.status, params.toStatus)) {
    return current;
  }
  const next = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: params.toStatus,
      version: { increment: 1 },
      // Keep original gateway snapshot (checkoutSnapshot/provider ids) intact.
      // Metadata is stored in status history for auditing, not as replacement payload.
      gatewayResponse: toJsonInput(
        current.gatewayResponse as Prisma.InputJsonValue,
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

/**
 * Handles cancel expired payments repo.
 */
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
      if (!canTransitionPaymentStatus(payment.status, "CANCELLED")) continue;
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
