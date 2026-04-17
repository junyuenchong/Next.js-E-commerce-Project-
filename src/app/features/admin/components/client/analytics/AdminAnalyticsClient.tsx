"use client";

import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { formatPriceRM } from "@/app/lib/format-price";
import { useAdminResourceSSE } from "@/app/features/admin/shared";
import type { AdminAnalyticsPayload } from "@/shared/types";

// Fetch analytics payload shared by dashboard and analytics page.
async function fetchAnalytics(): Promise<AdminAnalyticsPayload> {
  // Reuse the shared payload type so both admin pages stay in sync.
  const { data } = await http.get<AdminAnalyticsPayload>(
    "/features/admin/api/analytics",
  );
  return data;
}

export default function AdminAnalyticsClient() {
  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics-full"],
    queryFn: fetchAnalytics,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });

  useAdminResourceSSE(
    "/features/admin/api/events/orders",
    () => {
      void analyticsQuery.refetch();
    },
    15000,
  );

  const analyticsData = analyticsQuery.data;
  const showSkeleton = analyticsQuery.isLoading || !analyticsData;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sales by month and top products from fulfilled orders only.
        </p>
        {analyticsQuery.isError ? (
          <p className="mt-2 text-sm text-red-600">
            {getErrorMessage(analyticsQuery.error, "Could not load analytics.")}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Lifetime revenue
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {showSkeleton ? (
              <span className="inline-block h-8 w-28 animate-pulse rounded bg-gray-200" />
            ) : (
              formatPriceRM(analyticsData.revenueTotal)
            )}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase text-gray-500">
            Completed orders
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {showSkeleton ? (
              <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-200" />
            ) : (
              analyticsData.orderCount
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Revenue by month</h2>
        <p className="mt-1 text-xs text-gray-500">
          Last 12 months with fulfilled orders
        </p>
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
              {showSkeleton ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`m-skeleton-${idx}`}>
                    <td className="py-2 pr-4">
                      <span className="inline-block h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="py-2 pr-4">
                      <span className="inline-block h-4 w-20 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="py-2">
                      <span className="inline-block h-4 w-14 animate-pulse rounded bg-gray-200" />
                    </td>
                  </tr>
                ))
              ) : analyticsData.salesByMonth.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-gray-500">
                    No data yet.
                  </td>
                </tr>
              ) : (
                analyticsData.salesByMonth.map((row) => (
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
          {showSkeleton ? (
            <li className="h-20 animate-pulse rounded bg-gray-100" />
          ) : analyticsData.topProducts.length === 0 ? (
            <li className="text-gray-500">No sales yet.</li>
          ) : (
            analyticsData.topProducts.map((row) => (
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
