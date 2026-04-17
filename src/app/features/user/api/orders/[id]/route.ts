import { NextResponse } from "next/server";
import {
  getOrCreateInvoiceByOrderIdService,
  getOrderForUserByIdService,
} from "@/backend/modules/order";
import { moneyToNumber } from "@/backend/core/money";
import { resolveUserId } from "@/backend/core/session";
import { renderInvoiceText } from "@/backend/modules/order/invoice.format";

export const dynamic = "force-dynamic";

// Parses trailing `/orders/[id]` segment into a positive integer.
function parseId(req: Request): number | null {
  const parts = new URL(req.url).pathname.split("/");
  const raw = parts[parts.length - 1];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Returns one order detail payload for the authenticated owner.
export async function GET(req: Request) {
  const userId = await resolveUserId();
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orderId = parseId(req);
  if (!orderId)
    return NextResponse.json({ error: "invalid_order" }, { status: 400 });

  const row = await getOrderForUserByIdService(userId, orderId);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const invoice = await getOrCreateInvoiceByOrderIdService(row.id);

  const payload = {
    id: String(row.id),
    status: row.status.toLowerCase(),
    currency: row.currency,
    total: moneyToNumber(row.total),
    discountAmount: moneyToNumber(row.discountAmount),
    coupon: row.couponCodeSnapshot || row.coupon?.code || null,
    paypalOrderId: row.paypalOrderId,
    paypalCaptureId: row.paypalCaptureId ?? null,
    invoice: invoice
      ? {
          number: invoice.invoiceNumber,
          issuedAt: invoice.issuedAt.toISOString(),
          status: invoice.status,
          previewText: renderInvoiceText({
            invoiceNumber: invoice.invoiceNumber,
            issuedAt: invoice.issuedAt,
            billedEmail: invoice.billedEmail,
            currency: invoice.currency,
            subtotal: moneyToNumber(invoice.subtotal),
            discount: moneyToNumber(invoice.discount),
            total: moneyToNumber(invoice.total),
            couponCode: invoice.couponCode,
            orderId: invoice.orderId,
            lineItems: invoice.lineItems,
          }),
          downloadUrl: `/features/user/api/orders/${row.id}/invoice`,
        }
      : null,
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
