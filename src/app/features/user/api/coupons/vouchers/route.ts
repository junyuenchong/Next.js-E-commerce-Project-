/**
 * vouchers api
 * list promoted vouchers with optional subtotal hints
 */
import { NextResponse } from "next/server";
import { listStorefrontVouchersForUserService } from "@/backend/modules/coupon";
import { resolveUserId } from "@/backend/core/session";

export const dynamic = "force-dynamic";

// Returns storefront-visible vouchers, optionally evaluated against subtotal.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("subtotal");
  const subtotal =
    raw != null && raw.trim() !== "" ? Number.parseFloat(raw) : null;
  const sub =
    subtotal != null && Number.isFinite(subtotal) && subtotal >= 0
      ? subtotal
      : null;
  const userId = await resolveUserId();
  const vouchers = await listStorefrontVouchersForUserService({
    subtotal: sub,
    userId,
  });
  return NextResponse.json({ vouchers });
}
