import { NextResponse } from "next/server";
import type { OrderListItem } from "@/app/features/user/types";
import { listOrdersForUserService } from "@/backend/modules/order";
import { moneyToNumber } from "@/backend/core/money";
import { resolveUserId } from "@/backend/core/session";

// Parses cursor-based pagination params from query string.
function parseCursorParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursorRaw = searchParams.get("cursor");
  const limitRaw = searchParams.get("limit");
  const cursorId =
    cursorRaw != null && cursorRaw !== ""
      ? Number.parseInt(cursorRaw, 10)
      : undefined;
  const limit = limitRaw != null ? Number.parseInt(limitRaw, 10) : 40;
  const take = Number.isFinite(limit) ? limit : 40;
  const cursor =
    cursorId != null && Number.isFinite(cursorId) ? cursorId : undefined;
  return { cursor, take };
}

// Returns the authenticated user's order list (cursor-paginated).
export async function GET(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { cursor, take } = parseCursorParams(request);

  try {
    const { orders: rows, nextCursor } = await listOrdersForUserService(
      userId,
      cursor,
      take,
    );
    const payload = rows.map((orderRow) => ({
      id: String(orderRow.id),
      status: orderRow.status.toLowerCase() as OrderListItem["status"],
      total: moneyToNumber(orderRow.total),
      currency: orderRow.currency,
      paypalOrderId: orderRow.paypalOrderId,
      createdAt: orderRow.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { orders: payload, nextCursor },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-Next-Cursor": nextCursor != null ? String(nextCursor) : "",
        },
      },
    );
  } catch (error) {
    console.error("[orders GET]", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
