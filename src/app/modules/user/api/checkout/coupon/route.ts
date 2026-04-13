/** GET quote / POST apply / DELETE clear — checkout coupon + cart subtotal. */
import { NextResponse } from "next/server";
import { summarizeCartLines } from "@/app/lib/cart";
import {
  attachCheckoutCouponCookie,
  clearCheckoutCouponCookie,
  readCheckoutCouponCode,
} from "@/app/lib/checkout-coupon-cookie";
import type { CartItemRowData } from "@/app/modules/user/types";
import { getCartWithLiveProductsService } from "@/backend/modules/cart/cart.service";
import { resolveUserId } from "@/backend/lib/session";
import {
  resolveCheckoutCouponPricing,
  type ResolvedCheckoutCoupon,
} from "@/backend/modules/coupon/coupon.service";

async function cartSubtotal(): Promise<number | null> {
  const cart = await getCartWithLiveProductsService();
  if (!cart?.items?.length) return null;
  return summarizeCartLines(cart.items as CartItemRowData[]).totalPrice;
}

function appliedPayload(r: Extract<ResolvedCheckoutCoupon, { ok: true }>) {
  return r.codeSnapshot != null
    ? { code: r.codeSnapshot, couponId: r.couponId }
    : null;
}

export async function GET() {
  const subtotal = await cartSubtotal();
  if (subtotal == null) {
    return NextResponse.json({ error: "empty_cart" }, { status: 400 });
  }
  const userId = await resolveUserId();
  const code = await readCheckoutCouponCode();
  const r = await resolveCheckoutCouponPricing({
    subtotal,
    couponCode: code,
    userId,
  });
  if (!r.ok) {
    const res = NextResponse.json({
      subtotal,
      discountAmount: 0,
      total: subtotal,
      applied: null,
      couponError: r.error,
    });
    if (code) clearCheckoutCouponCookie(res);
    return res;
  }
  return NextResponse.json({
    subtotal,
    discountAmount: r.discountAmount,
    total: r.total,
    applied: appliedPayload(r),
  });
}

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
  const r = await resolveCheckoutCouponPricing({
    subtotal,
    couponCode: code,
    userId,
  });
  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: 400 });
  }
  const res = NextResponse.json({
    subtotal,
    discountAmount: r.discountAmount,
    total: r.total,
    applied: appliedPayload(r),
  });
  if (r.codeSnapshot) attachCheckoutCouponCookie(res, r.codeSnapshot);
  return res;
}

export async function DELETE() {
  const subtotal = await cartSubtotal();
  const res = NextResponse.json({
    subtotal: subtotal ?? 0,
    discountAmount: 0,
    total: subtotal ?? 0,
    applied: null,
  });
  clearCheckoutCouponCookie(res);
  return res;
}
