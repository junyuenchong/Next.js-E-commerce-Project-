/** Public list of promoted vouchers (cart / checkout strip). Optional `subtotal` for eligibility hints. */
import { NextResponse } from "next/server";
import { listStorefrontVouchersPublicService } from "@/backend/modules/coupon/coupon.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("subtotal");
  const subtotal =
    raw != null && raw.trim() !== "" ? Number.parseFloat(raw) : null;
  const sub =
    subtotal != null && Number.isFinite(subtotal) && subtotal >= 0
      ? subtotal
      : null;
  const vouchers = await listStorefrontVouchersPublicService({ subtotal: sub });
  return NextResponse.json({ vouchers });
}
