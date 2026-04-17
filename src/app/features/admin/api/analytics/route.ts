/**
 * Admin HTTP route: analytics.
 */

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import {
  ADMIN_CACHE_KEYS,
  ADMIN_CACHE_TTL_SECONDS,
  getAdminCachedJson,
  setAdminCachedJson,
} from "@/backend/modules/admin-cache";
import { adminApiRequire } from "@/backend/core/admin-api-guard";
import { moneyToNumber } from "@/backend/core/money";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const dynamic = "force-dynamic";

const SALES_STATUSES = ["fulfilled"] as const;

const MONTH_WINDOW = 12;

// Snap a date to the first day of its UTC month.
function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

// Move a UTC month boundary forward or backward by N months.
function addMonthsUtc(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

// Return cached admin analytics summary derived from fulfilled orders.
export async function GET() {
  try {
    const guard = await adminApiRequire("order.read");
    if (!guard.ok) return guard.response;

    const cached = await getAdminCachedJson<Record<string, unknown>>(
      ADMIN_CACHE_KEYS.analyticsSummary,
    );
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const [
      orderAgg,
      orderCount,
      userCount,
      productCount,
      topLines,
      recentOrdersRaw,
      salesByMonthRaw,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: { in: [...SALES_STATUSES] } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { status: { in: [...SALES_STATUSES] } } }),
      prisma.user.count(),
      prisma.product.count(),
      prisma
        .$queryRaw<{ productId: number; quantity: bigint }[]>(
          Prisma.sql`
          SELECT li."productId" AS "productId",
                 COALESCE(SUM(li."quantity"), 0)::bigint AS "quantity"
          FROM "OrderLineItem" li
          JOIN "Order" o ON o."id" = li."orderId"
          WHERE o."status" IN ('fulfilled')
          GROUP BY li."productId"
          ORDER BY "quantity" DESC
          LIMIT 8
        `,
        )
        .catch(() => [] as { productId: number; quantity: bigint }[]),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          emailSnapshot: true,
          user: { select: { email: true, name: true } },
        },
      }),
      prisma
        .$queryRaw<{ month: Date; revenue: unknown; order_count: bigint }[]>(
          Prisma.sql`
          SELECT date_trunc('month', "createdAt") AS month,
            COALESCE(SUM("total"), 0)::float AS revenue,
            COUNT(*)::bigint AS order_count
          FROM "Order"
          WHERE "status" IN ('fulfilled')
          GROUP BY 1
          ORDER BY 1 ASC
        `,
        )
        .catch(
          () => [] as { month: Date; revenue: unknown; order_count: bigint }[],
        ),
    ]);

    const productIds = topLines.map((l) => l.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, price: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const topProducts = topLines.map((line) => {
      const p = productMap.get(line.productId);
      return {
        productId: line.productId,
        quantity: Number(line.quantity ?? 0),
        product: p
          ? { id: p.id, title: p.title, price: moneyToNumber(p.price) }
          : null,
      };
    });

    const recentOrders = recentOrdersRaw.map((o) => ({
      id: o.id,
      status: o.status,
      currency: o.currency,
      createdAt: o.createdAt,
      emailSnapshot: o.emailSnapshot,
      user: o.user,
      total: moneyToNumber(o.total),
    }));

    const monthAgg = new Map(
      salesByMonthRaw.map((row) => [
        row.month.toISOString().slice(0, 10),
        {
          revenue: moneyToNumber(row.revenue),
          orderCount: Number(row.order_count),
        },
      ]),
    );
    const currentMonth = startOfMonthUtc(new Date());
    const firstMonth = addMonthsUtc(currentMonth, -(MONTH_WINDOW - 1));
    const salesByMonth = Array.from({ length: MONTH_WINDOW }, (_, index) => {
      const monthDate = addMonthsUtc(firstMonth, index);
      const monthKey = monthDate.toISOString().slice(0, 10);
      const agg = monthAgg.get(monthKey);
      return {
        month: monthKey,
        label: monthDate.toLocaleString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }),
        revenue: agg?.revenue ?? 0,
        orderCount: agg?.orderCount ?? 0,
      };
    });

    const payload = {
      revenueTotal: moneyToNumber(orderAgg._sum.total ?? 0),
      orderCount,
      userCount,
      productCount,
      topProducts,
      recentOrders,
      salesByMonth,
    };

    await setAdminCachedJson(
      ADMIN_CACHE_KEYS.analyticsSummary,
      payload,
      ADMIN_CACHE_TTL_SECONDS.analytics,
    );

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jsonInternalServerError(error, "[admin/api/analytics GET]");
  }
}
