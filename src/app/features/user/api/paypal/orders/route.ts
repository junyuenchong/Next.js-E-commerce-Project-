import { NextResponse } from "next/server";
import { readCheckoutCouponCode } from "@/app/lib/checkout-coupon-cookie";
import { summarizeCartLines } from "@/app/lib/cart";
import type { CartItemRowData } from "@/app/features/user/types";
import {
  createOrReusePayPalPaymentRepo,
  markPaymentFailedRepo,
  markPaymentProcessingRepo,
  paypalCreateOrder,
} from "@/backend/modules/payment";
import { getCartWithLiveProductsService } from "@/backend/modules/cart";
import { resolveCheckoutCouponPricing } from "@/backend/modules/coupon";
import { resolveUserId } from "@/backend/core/session";
import {
  buildPaidOrderLinesFromCart,
  validateCartStockForOrder,
} from "@/backend/modules/order";
import type { Prisma } from "@prisma/client";

const DEFAULT_CURRENCY = (
  process.env.PAYPAL_CURRENCY ||
  process.env.NEXT_PUBLIC_PAYPAL_CURRENCY ||
  "MYR"
).trim();

function resolveIdempotencyKey(request: Request, fallbackSeed: string) {
  const provided = request.headers.get("x-idempotency-key")?.trim();
  if (provided) return provided;
  return `paypal-create:${fallbackSeed}`;
}

// Creates a PayPal order from the current cart total after stock and coupon checks.
export async function POST(request: Request) {
  try {
    const cart = await getCartWithLiveProductsService();
    if (!cart?.items?.length) {
      return NextResponse.json({ error: "empty_cart" }, { status: 400 });
    }

    const cartLines = cart.items as Parameters<
      typeof validateCartStockForOrder
    >[0];
    const stockCheck = validateCartStockForOrder(cartLines);
    if (!stockCheck.ok) {
      return NextResponse.json(
        { error: "insufficient_stock", productId: stockCheck.productId },
        { status: 409 },
      );
    }

    const { totalPrice } = summarizeCartLines(cart.items as CartItemRowData[]);
    if (totalPrice <= 0) {
      return NextResponse.json({ error: "invalid_total" }, { status: 400 });
    }

    const couponCode = await readCheckoutCouponCode();
    const userId = await resolveUserId();
    const priced = await resolveCheckoutCouponPricing({
      subtotal: totalPrice,
      couponCode,
      userId,
    });
    if (!priced.ok) {
      return NextResponse.json({ error: priced.error }, { status: 400 });
    }

    const value = priced.total.toFixed(2);
    const idempotencyKey = resolveIdempotencyKey(
      request,
      `${userId ?? "guest"}:${cart.id}:${value}`,
    );
    const checkoutSnapshot = {
      lines: buildPaidOrderLinesFromCart(
        cartLines as Parameters<typeof buildPaidOrderLinesFromCart>[0],
      ),
      couponId: priced.couponId ?? null,
      couponCodeSnapshot: priced.codeSnapshot ?? null,
      subtotal: totalPrice,
      discount: priced.discountAmount,
      total: priced.total,
      currency: DEFAULT_CURRENCY,
    };
    const payment = await createOrReusePayPalPaymentRepo({
      userId,
      idempotencyKey,
      currency: DEFAULT_CURRENCY,
      subtotal: totalPrice,
      discount: priced.discountAmount,
      total: priced.total,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      gatewayResponse: {
        checkoutSnapshot,
      } as Prisma.InputJsonValue,
    });

    // Idempotent replay: return already-created gateway order without creating a new one.
    if (payment.providerOrderId) {
      return NextResponse.json({
        id: payment.providerOrderId,
        currencyCode: DEFAULT_CURRENCY,
        value,
        paymentId: payment.id,
        idempotencyKey,
      });
    }

    const created = await paypalCreateOrder({
      currencyCode: DEFAULT_CURRENCY,
      value,
    });

    if (!created) {
      await markPaymentFailedRepo({
        paymentId: payment.id,
        reason: "paypal_create_failed",
        gatewayResponse: { error: "paypal_create_failed" },
      }).catch(() => null);
      return NextResponse.json(
        { error: "paypal_create_failed" },
        { status: 502 },
      );
    }

    await markPaymentProcessingRepo({
      paymentId: payment.id,
      providerOrderId: created.id,
      gatewayResponse: {
        checkoutSnapshot,
        providerOrderId: created.id,
      } as Prisma.InputJsonValue,
    });

    return NextResponse.json({
      id: created.id,
      currencyCode: DEFAULT_CURRENCY,
      value,
      paymentId: payment.id,
      idempotencyKey,
    });
  } catch (error) {
    console.error("[paypal/orders]", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
