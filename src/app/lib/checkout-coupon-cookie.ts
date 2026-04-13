/** HttpOnly cookie: normalized coupon code applied at checkout (1h). */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeCouponCode } from "@/backend/modules/coupon/coupon.service";

export const CHECKOUT_COUPON_COOKIE = "checkout_coupon_code";

const MAX_AGE_SEC = 60 * 60;

const cookieBase = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: MAX_AGE_SEC,
  secure: process.env.NODE_ENV === "production",
};

export async function readCheckoutCouponCode(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(CHECKOUT_COUPON_COOKIE)?.value;
  if (!raw?.trim()) return null;
  try {
    const decoded = decodeURIComponent(raw).trim();
    return decoded ? normalizeCouponCode(decoded) : null;
  } catch {
    return normalizeCouponCode(raw);
  }
}

export function attachCheckoutCouponCookie(res: NextResponse, code: string) {
  const normalized = normalizeCouponCode(code);
  res.cookies.set(
    CHECKOUT_COUPON_COOKIE,
    encodeURIComponent(normalized),
    cookieBase,
  );
}

export function clearCheckoutCouponCookie(res: NextResponse) {
  res.cookies.set(CHECKOUT_COUPON_COOKIE, "", { ...cookieBase, maxAge: 0 });
}
