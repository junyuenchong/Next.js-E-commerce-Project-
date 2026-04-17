import { NextResponse } from "next/server";
import { findPaymentByProviderOrderIdRepo } from "@/backend/modules/payment";
import { getOrderIdByPayPalOrderIdService } from "@/backend/modules/order";

type RouteContext = { params: Promise<{ orderId: string }> };

// Returns server-side payment/order status for a PayPal order id.
export async function GET(_request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
  }

  const payment = await findPaymentByProviderOrderIdRepo("PAYPAL", orderId);
  const persistedOrderId = await getOrderIdByPayPalOrderIdService(orderId);

  return NextResponse.json({
    ok: true,
    payment: payment
      ? {
          id: payment.id,
          status: payment.status,
          orderId: payment.orderId,
        }
      : null,
    order: persistedOrderId ? { id: persistedOrderId } : null,
  });
}
