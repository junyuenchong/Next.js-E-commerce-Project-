import { NextResponse } from "next/server";
import { readCheckoutCouponCode } from "@/app/lib/checkout-coupon-cookie";
import { summarizeCartLines } from "@/app/lib/cart";
import type { CartItemRowData } from "@/app/features/user/types";
import { paypalCreateOrder } from "@/backend/modules/payment";
import { getCartWithLiveProductsService } from "@/backend/modules/cart";
import { resolveCheckoutCouponPricing } from "@/backend/modules/coupon";
import { resolveUserId } from "@/backend/core/session";
import { validateCartStockForOrder } from "@/backend/modules/order";

const DEFAULT_CURRENCY = (
  process.env.PAYPAL_CURRENCY ||
  process.env.NEXT_PUBLIC_PAYPAL_CURRENCY ||
  "MYR"
).trim();

// Creates a PayPal order from the current cart total after stock and coupon checks.
export async function POST() {
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
    const created = await paypalCreateOrder({
      currencyCode: DEFAULT_CURRENCY,
      value,
    });

    if (!created) {
      return NextResponse.json(
        { error: "paypal_create_failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      id: created.id,
      currencyCode: DEFAULT_CURRENCY,
      value,
    });
  } catch (error) {
    console.error("[paypal/orders]", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
