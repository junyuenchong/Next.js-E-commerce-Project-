"use client";

import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/lib/http";
import { formatPriceRM } from "@/app/lib/format-price";

type TopProduct = {
  productId: number;
  quantity: number;
  product: { id: number; title: string; price: number } | null;
};

type SalesMonth = {
  month: string;
  label: string;
  revenue: number;
  orderCount: number;
};

type AnalyticsPayload = {
  revenueTotal: number;
  orderCount: number;
  salesByMonth: SalesMonth[];
  topProducts: TopProduct[];
};

async function fetchAnalytics(): Promise<AnalyticsPayload> {
  const { data } = await http.get<AnalyticsPayload>(
    "/modules/admin/api/analytics",
  );
  return data;
}

export default function AdminAnalyticsClient() {
  const q = useQuery({
    queryKey: ["admin-analytics-full"],
    queryFn: fetchAnalytics,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  if (q.isLoading)
    return <p className="text-sm text-gray-500">Loading analytics…</p>;
  if (q.isError) {
    return (
      <p className="text-sm text-red-600">
        {getErrorMessage(q.error, "Could not load analytics.")}
      </p>
    );
  }

  const d = q.data!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sales by month and top products (excluding cancelled orders).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Lifetime revenue
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {formatPriceRM(d.revenueTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Orders (all statuses)
          </p>
          <p className="mt-2 text-2xl font-semibold">{d.orderCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Sales by month</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 pr-4">Month</th>
                <th className="py-2 pr-4">Revenue</th>
                <th className="py-2">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.salesByMonth.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-gray-500">
                    No data yet.
                  </td>
                </tr>
              ) : (
                d.salesByMonth.map((row) => (
                  <tr key={row.month}>
                    <td className="py-2 pr-4">{row.label}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {formatPriceRM(row.revenue)}
                    </td>
                    <td className="py-2 tabular-nums">{row.orderCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">
          Top products by units sold
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {d.topProducts.length === 0 ? (
            <li className="text-gray-500">No sales yet.</li>
          ) : (
            d.topProducts.map((row) => (
              <li
                key={row.productId}
                className="flex justify-between gap-2 border-b border-gray-100 py-2 last:border-0"
              >
                <span className="truncate">
                  {row.product?.title ?? `Product #${row.productId}`}
                </span>
                <span className="shrink-0 tabular-nums text-gray-600">
                  {row.quantity} units
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
