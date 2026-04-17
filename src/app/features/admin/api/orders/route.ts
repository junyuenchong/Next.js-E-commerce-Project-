/**
 * Admin HTTP route: orders.
 */

import { NextResponse } from "next/server";
import { bustAdminAnalyticsCache } from "@/backend/modules/admin-cache";
import {
  ADMIN_LIST_DEFAULT,
  clampAdminListLimit,
  parseAdminCursorId,
} from "@/backend/shared/pagination/admin-pagination";
import prisma from "@/app/lib/prisma";
import {
  listAllOrdersAdminService,
  updateOrderShipmentAdminService,
  updateOrderStatusAdminService,
} from "@/backend/modules/order";
import {
  updateOrderShipmentSchema,
  updateOrderStatusSchema,
} from "@/shared/schema";
import {
  adminApiRequire,
  adminJsonForbidden,
  adminJsonUnauthorized,
} from "@/backend/core/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { adminUserHasPermission } from "@/backend/modules/access-control";
import { getCurrentAdminUser } from "@/backend/core/session";
import { moneyToNumber } from "@/backend/core/money";
import { jsonInternalServerError } from "@/backend/lib/api-error";
import { resolveStockMutationForTransition } from "@/backend/core/stock-policy";

// Parse shared cursor/search params for the orders list endpoint.
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

// Return paginated admin order rows for the orders table.
export async function GET(request: Request) {
  try {
    const guard = await adminApiRequire("order.read");
    if (!guard.ok) return guard.response;

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
  } catch (error) {
    return jsonInternalServerError(error, "[admin/api/orders GET]");
  }
}

// Update either order status or shipment details from one endpoint.
export async function PATCH(request: Request) {
  const json = (await request.json().catch(() => null)) as unknown;
  const statusParsed = updateOrderStatusSchema.safeParse(json);
  const shipmentParsed = updateOrderShipmentSchema.safeParse(json);
  if (!statusParsed.success && !shipmentParsed.success) {
    const statusErrors = statusParsed.error.issues.map(
      (issue) => issue.message,
    );
    const shipmentErrors = shipmentParsed.error.issues.map(
      (issue) => issue.message,
    );
    return NextResponse.json(
      {
        error: "invalid_body",
        message:
          "Body must match either status update or shipment update payload.",
        details: {
          status: statusErrors,
          shipment: shipmentErrors,
        },
      },
      { status: 400 },
    );
  }

  const user = await getCurrentAdminUser();
  if (!user) {
    return adminJsonUnauthorized();
  }

  // Handle status updates first because shipment schema is permissive and
  // also accepts `{ orderId }` payloads.
  if (statusParsed.success) {
    const target = statusParsed.data.status;
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
      where: { id: statusParsed.data.orderId },
      select: { status: true },
    });
    if (!previous) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    try {
      const order = await updateOrderStatusAdminService(
        statusParsed.data.orderId,
        statusParsed.data.status,
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
      return NextResponse.json({
        ...order,
        stockMutation: resolveStockMutationForTransition(
          previous.status,
          order.status,
        ),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "insufficient_stock_for_status_transition"
      ) {
        return NextResponse.json(
          {
            error: "insufficient_stock_for_status_transition",
            message:
              "Current product stock is not enough for this status transition.",
          },
          { status: 409 },
        );
      }
      return jsonInternalServerError(
        error,
        "[admin/api/orders PATCH]",
        "update_failed",
      );
    }
  }

  if (!shipmentParsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const allowed = await adminUserHasPermission(user, "order.update");
  if (!allowed) {
    return adminJsonForbidden(
      "You don't have permission to update shipment details.",
    );
  }

  try {
    const order = await updateOrderShipmentAdminService(
      shipmentParsed.data.orderId,
      {
        shippingCarrier: shipmentParsed.data.shippingCarrier ?? null,
        trackingNumber: shipmentParsed.data.trackingNumber ?? null,
        trackingUrl: shipmentParsed.data.trackingUrl ?? null,
      },
    );
    const actorId = adminActorNumericId(user);
    if (actorId != null) {
      void logAdminAction({
        actorUserId: actorId,
        action: "order.shipment",
        targetType: "Order",
        targetId: String(order.id),
        metadata: {
          shippingCarrier: order.shippingCarrier ?? null,
          trackingNumber: order.trackingNumber ?? null,
          trackingUrl: order.trackingUrl ?? null,
          shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
        },
      });
    }
    void bustAdminAnalyticsCache();
    return NextResponse.json(order);
  } catch (error) {
    return jsonInternalServerError(
      error,
      "[admin/api/orders PATCH shipment]",
      "update_failed",
    );
  }
}
