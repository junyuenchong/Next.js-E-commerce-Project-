import { NextResponse } from "next/server";
import { getOrderAdminByIdService } from "@/backend/modules/order";
import { adminApiRequire } from "@/backend/core/admin-api-guard";
import { moneyToNumber } from "@/backend/core/money";
import { jsonInternalServerError } from "@/backend/lib/api-error";

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

    return NextResponse.json(
      {
        ...order,
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
