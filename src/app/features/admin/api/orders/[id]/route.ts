import { NextResponse } from "next/server";
import {
  getOrCreateInvoiceByOrderIdService,
  getOrderAdminByIdService,
} from "@/backend/modules/order";
import { adminApiRequire } from "@/backend/core/admin-api-guard";
import { moneyToNumber } from "@/backend/core/money";
import { jsonInternalServerError } from "@/backend/lib/api-error";
import { renderInvoiceText } from "@/backend/modules/order/invoice.format";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const g = await adminApiRequire("order.read");
    if (!g.ok) return g.response;

    const { id: idParam } = await context.params;
    const id = Number.parseInt(idParam, 10);
    if (!Number.isFinite(id) || id < 1) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    }

    const order = await getOrderAdminByIdService(id);
    if (!order) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const invoice = await getOrCreateInvoiceByOrderIdService(order.id);

    return NextResponse.json(
      {
        ...order,
        invoice: invoice
          ? {
              ...invoice,
              issuedAt: invoice.issuedAt.toISOString(),
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
              downloadUrl: `/features/admin/api/orders/${order.id}/invoice`,
            }
          : null,
        total: moneyToNumber(order.total),
        discountAmount: moneyToNumber(order.discountAmount),
        items: order.items.map((line) => ({
          ...line,
          unitPrice: moneyToNumber(line.unitPrice),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonInternalServerError(error, "[admin/api/orders/[id] GET]");
  }
}
