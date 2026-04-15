"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { formatPriceRM } from "@/app/lib/format-price";

type TopProduct = {
  productId: number;
  quantity: number;
  product: { id: number; title: string; price: number } | null;
};

type RecentOrder = {
  id: number;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  emailSnapshot: string | null;
  user: { email: string | null; name: string | null } | null;
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
  userCount: number;
  productCount: number;
  topProducts: TopProduct[];
  recentOrders: RecentOrder[];
  salesByMonth: SalesMonth[];
};

async function fetchAnalytics(): Promise<AnalyticsPayload> {
  const { data } = await http.get<AnalyticsPayload>(
    "/modules/admin/api/analytics",
  );
  return data;
}

function RevenueLineChart({ data }: { data: SalesMonth[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No paid order history yet.</p>;
  }
  const w = 480;
  const h = 160;
  const pad = 28;
  const maxR = Math.max(...data.map((d) => d.revenue), 1);
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;
  const xCount = Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + (i / xCount) * innerW;
    const y = pad + innerH - (d.revenue / maxR) * innerH;
    return `${x},${y}`;
  });
  const poly = points.join(" ");

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-xl text-blue-600"
        preserveAspectRatio="none"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={poly}
        />
        {data.map((d, i) => {
          const x = pad + (i / xCount) * innerW;
          const y = pad + innerH - (d.revenue / maxR) * innerH;
          return (
            <circle key={d.month} cx={x} cy={y} r="4" fill="currentColor" />
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
        {data.map((d) => (
          <span key={d.month}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const q = useQuery({
    queryKey: ["admin-analytics-dashboard"],
    queryFn: fetchAnalytics,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  if (q.isLoading) {
    return <p className="text-sm text-gray-500">Loading overview…</p>;
  }
  if (q.isError) {
    return (
      <p className="text-sm text-red-600">
        {getErrorMessage(q.error, "Could not load dashboard.")}
      </p>
    );
  }

  const d = q.data!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of sales, orders, and quick links to admin tools.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total sales
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatPriceRM(d.revenueTotal)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Excluding cancelled orders
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total orders
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {d.orderCount}
          </p>
          <Link
            href="/modules/admin/orders"
            className="mt-2 inline-block text-xs text-blue-600 hover:underline"
          >
            View orders →
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Users
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {d.userCount}
          </p>
          <Link
            href="/modules/admin/users"
            className="mt-2 inline-block text-xs text-blue-600 hover:underline"
          >
            Manage users →
          </Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Products
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {d.productCount}
          </p>
          <Link
            href="/modules/admin/products"
            className="mt-2 inline-block text-xs text-blue-600 hover:underline"
          >
            Catalog →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Coupons &amp; discounts
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Manage promo codes (cart + PayPal). Admin changes are logged in the{" "}
          <Link
            href="/modules/admin/audit-log"
            className="font-medium text-blue-600 hover:underline"
          >
            audit log
          </Link>
          .
        </p>
        <Link
          href="/modules/admin/coupons"
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Open coupons page →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900">
            Revenue by month
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Last 12 months with paid activity
          </p>
          <div className="mt-4">
            <RevenueLineChart data={d.salesByMonth} />
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900">Top products</h2>
          <p className="mt-1 text-sm text-gray-600">By units sold (all time)</p>
          <ul className="mt-4 space-y-2 text-sm">
            {d.topProducts.length === 0 ? (
              <li className="text-gray-500">No line items yet.</li>
            ) : (
              d.topProducts.map((row) => (
                <li
                  key={row.productId}
                  className="flex justify-between gap-2 border-b border-gray-100 py-2 last:border-0"
                >
                  <span className="truncate text-gray-800">
                    {row.product?.title ?? `Product #${row.productId}`}
                  </span>
                  <span className="shrink-0 tabular-nums text-gray-600">
                    {row.quantity} sold
                  </span>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/modules/admin/analytics"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            Full analytics →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-gray-900">Recent orders</h2>
          <Link
            href="/modules/admin/orders"
            className="text-sm text-blue-600 hover:underline"
          >
            All orders
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {d.recentOrders.map((o) => {
                const email = o.user?.email ?? o.emailSnapshot ?? "—";
                return (
                  <tr key={o.id}>
                    <td className="py-2 pr-4 font-mono text-xs">
                      <Link
                        href={`/modules/admin/orders/${o.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {o.id}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap text-gray-700">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 max-w-[200px] truncate text-gray-700">
                      {email}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{o.status}</td>
                    <td className="py-2 tabular-nums">
                      {formatPriceRM(o.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: "/modules/admin/products",
            title: "Products",
            desc: "CRUD, stock, images",
          },
          {
            href: "/modules/admin/categories",
            title: "Categories",
            desc: "Organize catalog",
          },
          {
            href: "/modules/admin/reviews",
            title: "Reviews",
            desc: "Reply to customers",
          },
          {
            href: "/modules/admin/coupons",
            title: "Coupons & discounts",
            desc: "Promo codes & cart discounts",
          },
          {
            href: "/modules/admin/role-permissions",
            title: "Permissions",
            desc: "RBAC profiles",
          },
        ].map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300"
            >
              <h3 className="font-medium text-gray-900">{c.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{c.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
