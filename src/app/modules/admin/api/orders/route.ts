import { NextResponse } from "next/server";
import { bustAdminAnalyticsCache } from "@/app/lib/admin-cache";
import {
  ADMIN_LIST_DEFAULT,
  clampAdminListLimit,
  parseAdminCursorId,
} from "@/app/lib/admin-pagination";
import prisma from "@/app/lib/prisma";
import {
  listAllOrdersAdminService,
  updateOrderStatusAdminService,
} from "@/backend/modules/order/order.service";
import { updateOrderStatusSchema } from "@/app/modules/admin/schema/order.schema";
import {
  adminApiRequire,
  adminJsonForbidden,
  adminJsonUnauthorized,
} from "@/backend/lib/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/lib/admin-action-log";
import { adminUserHasPermission } from "@/backend/lib/permission-resolver";
import { getCurrentAdminUser } from "@/backend/lib/session";
import { moneyToNumber } from "@/backend/lib/money";

function parseCursorParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const take = clampAdminListLimit(
    searchParams.get("limit"),
    ADMIN_LIST_DEFAULT.orders,
  );
  const cursor = parseAdminCursorId(searchParams.get("cursor"));
  return { cursor, take, q };
}

export async function GET(request: Request) {
  const g = await adminApiRequire("order.read");
  if (!g.ok) return g.response;

  const { cursor, take, q } = parseCursorParams(request);
  const { orders, nextCursor } = await listAllOrdersAdminService(
    cursor,
    take,
    q,
  );

  const payload = orders.map((o) => ({
    ...o,
    total: moneyToNumber(o.total),
    items: o.items.map((line) => ({
      ...line,
      unitPrice: moneyToNumber(line.unitPrice),
    })),
  }));

  return NextResponse.json(
    {
      orders: payload,
      nextCursor,
      hasMore: nextCursor != null,
      limit: take,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Next-Cursor": nextCursor != null ? String(nextCursor) : "",
      },
    },
  );
}

export async function PATCH(request: Request) {
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = updateOrderStatusSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const user = await getCurrentAdminUser();
  if (!user) {
    return adminJsonUnauthorized();
  }

  const target = parsed.data.status;
  const needRefund = target === "cancelled";
  const allowed = needRefund
    ? await adminUserHasPermission(user, "order.refund")
    : await adminUserHasPermission(user, "order.update");
  if (!allowed) {
    return adminJsonForbidden(
      needRefund
        ? "You don't have permission to cancel orders (refund permission required)."
        : "You don't have permission to update order status.",
    );
  }

  const previous = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: { status: true },
  });
  if (!previous) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const order = await updateOrderStatusAdminService(
      parsed.data.orderId,
      parsed.data.status,
    );
    const actorId = adminActorNumericId(user);
    if (actorId != null) {
      const refundLike = target === "cancelled";
      void logAdminAction({
        actorUserId: actorId,
        action: refundLike ? "order.refund" : "order.status",
        targetType: "Order",
        targetId: String(order.id),
        metadata: { from: previous.status, to: order.status },
      });
    }
    void bustAdminAnalyticsCache();
    return NextResponse.json(order);
  } catch (e) {
    console.error("[admin/orders PATCH]", e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}
