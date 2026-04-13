import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";
import { getOrderForUserByIdService } from "@/backend/modules/order/order.service";
import { moneyToNumber } from "@/backend/lib/money";

export const dynamic = "force-dynamic";

function parseId(req: Request): number | null {
  const parts = new URL(req.url).pathname.split("/");
  const raw = parts[parts.length - 1];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = Number.parseInt(String(user.id), 10);
  if (!Number.isFinite(userId))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orderId = parseId(req);
  if (!orderId)
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });

  const row = await getOrderForUserByIdService(userId, orderId);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const payload = {
    id: String(row.id),
    status: row.status.toLowerCase(),
    currency: row.currency,
    total: moneyToNumber(row.total),
    discountAmount: moneyToNumber(row.discountAmount),
    coupon: row.couponCodeSnapshot || row.coupon?.code || null,
    paypalOrderId: row.paypalOrderId,
    paypalCaptureId: row.paypalCaptureId ?? null,
    emailSnapshot: row.emailSnapshot ?? null,
    shipping: {
      line1: row.shippingLine1 ?? null,
      city: row.shippingCity ?? null,
      postcode: row.shippingPostcode ?? null,
      country: row.shippingCountry ?? null,
      method: row.shippingMethod ?? null,
    },
    createdAt: row.createdAt.toISOString(),
    items: row.items.map((i) => ({
      id: String(i.id),
      productId: i.productId,
      title: i.title,
      quantity: i.quantity,
      unitPrice: moneyToNumber(i.unitPrice),
      imageUrl: i.imageUrl ?? null,
    })),
  };

  return NextResponse.json(
    { order: payload },
    { headers: { "Cache-Control": "no-store" } },
  );
}
