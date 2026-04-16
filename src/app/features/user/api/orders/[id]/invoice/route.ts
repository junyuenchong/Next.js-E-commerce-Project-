import { NextResponse } from "next/server";
import { moneyToNumber } from "@/backend/core/money";
import {
  getInvoiceForUserByOrderIdService,
  getOrCreateInvoiceByOrderIdService,
  getOrderForUserByIdService,
} from "@/backend/modules/order";
import { renderInvoiceText } from "@/backend/modules/order/invoice.format";
import { resolveUserId } from "@/backend/core/session";

type RouteContext = { params: Promise<{ id: string }> };

function parseParamId(raw: string | undefined): number | null {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: idParam } = await context.params;
  const orderId = parseParamId(idParam);
  if (!orderId) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const order = await getOrderForUserByIdService(userId, orderId);
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const invoice =
    (await getInvoiceForUserByOrderIdService(userId, orderId)) ??
    (await getOrCreateInvoiceByOrderIdService(orderId));
  if (!invoice) {
    return NextResponse.json({ error: "invoice_not_found" }, { status: 404 });
  }

  const invoiceText = renderInvoiceText({
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
  });
  const preview = new URL(request.url).searchParams.get("preview") === "1";

  return new NextResponse(invoiceText, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...(preview
        ? {}
        : {
            "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.txt"`,
          }),
    },
  });
}
