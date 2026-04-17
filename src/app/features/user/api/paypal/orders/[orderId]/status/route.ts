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
export async function GET(_request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
  }

  const payment = await findPaymentByProviderOrderIdRepo("PAYPAL", orderId);
  let persistedOrderId = await getOrderIdByPayPalOrderIdService(orderId);

  // Fallback reconcile: if payment is already PAID but webhook order-linking is delayed,
  // create/link the order from stored checkout snapshot so checkout can complete.
  if (
    payment &&
    payment.status === "PAID" &&
    persistedOrderId == null &&
    payment.orderId == null
  ) {
    const snapshot = readCheckoutSnapshot(payment.gatewayResponse);
    if (snapshot) {
      try {
        const order = await createPaidOrderAfterCaptureService(
          {
            userId: payment.userId,
            emailSnapshot: null,
            currency: snapshot.currency,
            total: snapshot.total,
            paypalOrderId: orderId,
            paypalCaptureId: payment.providerCaptureId,
            lines: snapshot.lines,
            couponId: snapshot.couponId,
            couponCodeSnapshot: snapshot.couponCodeSnapshot,
            discountAmount: snapshot.discount,
          },
          { skipStockDecrement: !deductStockOnPaid() },
        );
        persistedOrderId = order.id;
        await markPaymentPaidAndLinkOrderRepo({
          paymentId: payment.id,
          orderId: order.id,
          providerCaptureId: payment.providerCaptureId,
        }).catch(() => null);
      } catch {
        // Race-safe: another request/webhook may have already created the order.
        persistedOrderId = await getOrderIdByPayPalOrderIdService(orderId);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    payment: payment
      ? {
          id: payment.id,
          status: payment.status,
          orderId: payment.orderId ?? persistedOrderId ?? null,
          expiresAt: payment.expiresAt,
        }
      : null,
    order: persistedOrderId ? { id: persistedOrderId } : null,
  });
}
