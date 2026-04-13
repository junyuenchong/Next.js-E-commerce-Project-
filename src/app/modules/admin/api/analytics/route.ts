import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import {
  ADMIN_CACHE_KEYS,
  ADMIN_CACHE_TTL_SECONDS,
  getAdminCachedJson,
  setAdminCachedJson,
} from "@/app/lib/admin-cache";
import { adminApiRequire } from "@/backend/lib/admin-api-guard";
import { moneyToNumber } from "@/backend/lib/money";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await adminApiRequire("order.read");
  if (!g.ok) return g.response;

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
      where: { status: { not: "cancelled" } },
      _sum: { total: true },
    }),
    prisma.order.count(),
    prisma.user.count(),
    prisma.product.count(),
    prisma.orderLineItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
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
        WHERE "status" <> 'cancelled'
        GROUP BY 1
        ORDER BY 1 ASC
        LIMIT 12
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
      quantity: line._sum.quantity ?? 0,
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

  const salesByMonth = salesByMonthRaw.map((row) => ({
    month: row.month.toISOString().slice(0, 10),
    label: row.month.toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    }),
    revenue: moneyToNumber(row.revenue),
    orderCount: Number(row.order_count),
  }));

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
}
