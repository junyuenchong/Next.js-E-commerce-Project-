/** GET quote / POST apply / DELETE clear — checkout coupon + cart subtotal. */
import { NextResponse } from "next/server";
import { summarizeCartLines } from "@/app/lib/cart";
import {
  attachCheckoutCouponCookie,
  clearCheckoutCouponCookie,
  readCheckoutCouponCode,
} from "@/app/lib/checkout-coupon-cookie";
import type { CartItemRowData } from "@/app/features/user/types";
import { getCartWithLiveProductsService } from "@/backend/modules/cart";
import { resolveUserId } from "@/backend/core/session";
import {
  resolveCheckoutCouponPricing,
  type ResolvedCheckoutCoupon,
} from "@/backend/modules/coupon";

// Reads current cart subtotal for coupon quote/apply flows.
async function cartSubtotal(): Promise<number | null> {
  const cart = await getCartWithLiveProductsService();
  if (!cart?.items?.length) return null;
  return summarizeCartLines(cart.items as CartItemRowData[]).totalPrice;
}

// Normalizes successful coupon result into API response shape.
function appliedPayload(
  resolvedCoupon: Extract<ResolvedCheckoutCoupon, { ok: true }>,
) {
  return resolvedCoupon.codeSnapshot != null
    ? { code: resolvedCoupon.codeSnapshot, couponId: resolvedCoupon.couponId }
    : null;
}

// Returns current coupon quote for the cart subtotal.
export async function GET() {
  const subtotal = await cartSubtotal();
  if (subtotal == null) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }
  const userId = await resolveUserId();
  const code = await readCheckoutCouponCode();
  const resolvedCoupon = await resolveCheckoutCouponPricing({
    subtotal,
    couponCode: code,
    userId,
  });
  if (!resolvedCoupon.ok) {
    const response = NextResponse.json({
      subtotal,
      discountAmount: 0,
      total: subtotal,
      applied: null,
      couponError: resolvedCoupon.error,
    });
    if (code) clearCheckoutCouponCookie(response);
    return response;
  }
  return NextResponse.json({
    subtotal,
    discountAmount: resolvedCoupon.discountAmount,
    total: resolvedCoupon.total,
    applied: appliedPayload(resolvedCoupon),
  });
}

// Applies a coupon code and persists it in checkout cookie when valid.
export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = typeof json?.code === "string" ? json.code : "";
  if (!code.trim()) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }
  const subtotal = await cartSubtotal();
  if (subtotal == null) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }
  const userId = await resolveUserId();
  const resolvedCoupon = await resolveCheckoutCouponPricing({
    subtotal,
    couponCode: code,
    userId,
  });
  if (!resolvedCoupon.ok) {
    return NextResponse.json({ error: resolvedCoupon.error }, { status: 400 });
  }
  const response = NextResponse.json({
    subtotal,
    discountAmount: resolvedCoupon.discountAmount,
    total: resolvedCoupon.total,
    applied: appliedPayload(resolvedCoupon),
  });
  if (resolvedCoupon.codeSnapshot) {
    attachCheckoutCouponCookie(response, resolvedCoupon.codeSnapshot);
  }
  return response;
}

// Clears checkout coupon cookie and returns zero-discount totals.
export async function DELETE() {
  const subtotal = await cartSubtotal();
  const response = NextResponse.json({
    subtotal: subtotal ?? 0,
    discountAmount: 0,
    total: subtotal ?? 0,
    applied: null,
  });
  clearCheckoutCouponCookie(response);
  return response;
}
