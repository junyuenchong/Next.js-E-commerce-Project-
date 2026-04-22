import { NextResponse } from "next/server";
import {
  findPaymentByProviderOrderIdRepo,
  markPaymentPaidAndLinkOrderRepo,
} from "@/backend/modules/payment";
import { getOrderIdByPayPalOrderIdService } from "@/backend/modules/order";
import { createPaidOrderAfterCaptureService } from "@/backend/modules/order";
import { deductStockOnPaid } from "@/backend/core/stock-policy";

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

type RouteContext = { params: Promise<{ orderId: string }> };

// Returns server-side payment/order status for a PayPal order id.
export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
  }

  const paymentRecord = await findPaymentByProviderOrderIdRepo(
    "PAYPAL",
    orderId,
  );
  let persistedOrderId = await getOrderIdByPayPalOrderIdService(orderId);
  const isPaymentPending =
    paymentRecord?.status === "PENDING" ||
    paymentRecord?.status === "PROCESSING";
  // allow status checks with the same idempotency key used during create/capture.
  const requestedIdempotencyKey =
    request.headers.get("x-idempotency-key")?.trim() ||
    new URL(request.url).searchParams.get("idempotencyKey")?.trim() ||
    null;
  if (
    requestedIdempotencyKey &&
    paymentRecord &&
    requestedIdempotencyKey !== paymentRecord.idempotencyKey
  ) {
    return NextResponse.json(
      {
        error: "idempotency_key_mismatch",
        message: "idempotency key does not match this transaction",
      },
      { status: 409 },
    );
  }

  // Fallback reconcile: if payment is already PAID but webhook order-linking is delayed,
  // create/link the order from stored checkout snapshot so checkout can complete.
  if (
    paymentRecord &&
    paymentRecord.status === "PAID" &&
    persistedOrderId == null &&
    paymentRecord.orderId == null
  ) {
    const snapshot = readCheckoutSnapshot(paymentRecord.gatewayResponse);
    if (snapshot) {
      try {
        const order = await createPaidOrderAfterCaptureService(
          {
            userId: paymentRecord.userId,
            emailSnapshot: null,
            currency: snapshot.currency,
            total: snapshot.total,
            paypalOrderId: orderId,
            paypalCaptureId: paymentRecord.providerCaptureId,
            lines: snapshot.lines,
            couponId: snapshot.couponId,
            couponCodeSnapshot: snapshot.couponCodeSnapshot,
            discountAmount: snapshot.discount,
          },
          { skipStockDecrement: !deductStockOnPaid() },
        );
        persistedOrderId = order.id;
        await markPaymentPaidAndLinkOrderRepo({
          paymentId: paymentRecord.id,
          orderId: order.id,
          providerCaptureId: paymentRecord.providerCaptureId,
        }).catch(() => null);
      } catch {
        // Race-safe: another request/webhook may have already created the order.
        persistedOrderId = await getOrderIdByPayPalOrderIdService(orderId);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    pending: isPaymentPending,
    // internal unique transaction id for tracking this payment across logs.
    transactionId: paymentRecord ? `PAYPAL-${paymentRecord.id}` : null,
    idempotency: paymentRecord
      ? {
          key: paymentRecord.idempotencyKey,
          statusChecked: true,
          matched:
            !requestedIdempotencyKey ||
            requestedIdempotencyKey === paymentRecord.idempotencyKey,
        }
      : null,
    payment: paymentRecord
      ? {
          id: paymentRecord.id,
          status: paymentRecord.status,
          orderId: paymentRecord.orderId ?? persistedOrderId ?? null,
          expiresAt: paymentRecord.expiresAt,
        }
      : null,
    order: persistedOrderId ? { id: persistedOrderId } : null,
  });
}
