import { NextResponse } from "next/server";
import { markOrderReceivedByUserService } from "@/backend/modules/order";
import { resolveUserId } from "@/backend/core/session";

export const dynamic = "force-dynamic";

function parseId(req: Request): number | null {
  const parts = new URL(req.url).pathname.split("/");
  // .../orders/[id]/received
  const raw = parts[parts.length - 2];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// User confirms order received (Shopee-like). This unlocks reviews.
export async function POST(req: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const orderId = parseId(req);
  if (!orderId) {
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });
  }

  const result = await markOrderReceivedByUserService({ userId, orderId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
