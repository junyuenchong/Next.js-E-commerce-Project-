"use client";

import { OrderStatus } from "@prisma/client";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/lib/http";

type OrderLine = {
  id: number;
  productId: number;
  title: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

type AdminOrderRow = {
  id: number;
  userId: number | null;
  status: OrderStatus;
  currency: string;
  total: number;
  paypalOrderId: string;
  paypalCaptureId: string | null;
  emailSnapshot: string | null;
  shippingLine1: string | null;
  shippingCity: string | null;
  shippingPostcode: string | null;
  shippingCountry: string | null;
  shippingMethod: string | null;
  createdAt: string;
  updatedAt: string;
  user: { email: string | null; name: string | null } | null;
  items: OrderLine[];
};

type OrdersPage = { orders: AdminOrderRow[]; nextCursor: number | null };

type Me = {
  can: { orderRead: boolean; orderUpdate: boolean; orderRefund: boolean };
};

const ORDERS_PATH = "/modules/admin/api/orders";
const PAGE_SIZE = 25;

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "fulfilled",
  "cancelled",
];

async function fetchAdminMe(): Promise<Me> {
  const { data } = await http.get<Me>("/modules/admin/api/me");
  return data;
}

async function fetchOrdersPage(
  cursor?: number,
  q?: string,
): Promise<OrdersPage> {
  const params = new URLSearchParams();
  params.set("limit", String(PAGE_SIZE));
  if (cursor != null) params.set("cursor", String(cursor));
  if (q?.trim()) params.set("q", q.trim());
  const { data } = await http.get<OrdersPage>(
    `${ORDERS_PATH}?${params.toString()}`,
  );
  return data;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function customerLabel(o: AdminOrderRow) {
  const email = o.user?.email ?? o.emailSnapshot;
  const name = o.user?.name;
  if (email && name) return `${name} · ${email}`;
  if (email) return email;
  return "Guest / no email";
}

type SortKey = "newest" | "oldest" | "total_desc" | "total_asc";

export default function AdminOrdersClient() {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [draftStatus, setDraftStatus] = useState<Record<number, OrderStatus>>(
    {},
  );
  const [savingId, setSavingId] = useState<number | null>(null);
  const [banner, setBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchAdminMe,
    staleTime: 60_000,
  });

  const canRead = me?.can.orderRead ?? false;
  const canUpdate = me?.can.orderUpdate ?? false;
  const canRefund = me?.can.orderRefund ?? false;

  const ordersQuery = useInfiniteQuery({
    queryKey: ["admin-orders", searchQ],
    enabled: canRead,
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      fetchOrdersPage(pageParam, searchQ || undefined),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const rows = useMemo(
    () => ordersQuery.data?.pages.flatMap((p) => p.orders) ?? [],
    [ordersQuery.data?.pages],
  );

  // Debounced search-as-you-type (still supports enter-to-search form).
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchDraft.trim();
      if (next === searchQ) return;
      setSearchQ(next);
    }, 450);
    return () => clearTimeout(t);
  }, [searchDraft, searchQ]);

  const visibleRows = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? rows
        : rows.filter((o) => o.status === statusFilter);
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "total_desc":
          return b.total - a.total;
        case "total_asc":
          return a.total - b.total;
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
    return sorted;
  }, [rows, sortKey, statusFilter]);

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const statusForRow = useCallback(
    (o: AdminOrderRow) => draftStatus[o.id] ?? o.status,
    [draftStatus],
  );

  const setStatusDraft = useCallback((orderId: number, status: OrderStatus) => {
    setDraftStatus((d) => ({ ...d, [orderId]: status }));
  }, []);

  const saveStatus = useCallback(
    async (o: AdminOrderRow) => {
      const next = statusForRow(o);
      if (next === o.status) {
        setBanner({ kind: "ok", text: "No change to save." });
        return;
      }
      if (next === "cancelled" && !canRefund) {
        setBanner({
          kind: "err",
          text: "You need refund permission to cancel an order.",
        });
        return;
      }
      if (next !== "cancelled" && !canUpdate) {
        setBanner({
          kind: "err",
          text: "You don't have permission to update order status.",
        });
        return;
      }

      setSavingId(o.id);
      setBanner(null);
      try {
        await http.patch(ORDERS_PATH, { orderId: o.id, status: next });
        setDraftStatus((d) => {
          const copy = { ...d };
          delete copy[o.id];
          return copy;
        });
        await ordersQuery.refetch();
        setBanner({ kind: "ok", text: `Order #${o.id} updated to ${next}.` });
      } catch (e) {
        setBanner({ kind: "err", text: getErrorMessage(e, "Update failed") });
      } finally {
        setSavingId(null);
      }
    },
    [canRefund, canUpdate, ordersQuery, statusForRow],
  );

  const canSaveStatus = useCallback(
    (draft: OrderStatus, original: OrderStatus) => {
      if (draft === original) return false;
      if (draft === "cancelled") return canRefund;
      return canUpdate;
    },
    [canRefund, canUpdate],
  );

  if (!canRead) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        You don&apos;t have permission to view orders.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-600">
          PayPal checkout orders. Search by order id, PayPal id, or email. Open
          a row for full details. Cancelling requires refund permission.
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearchQ(searchDraft.trim());
        }}
      >
        <input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Search orders…"
          className="min-w-[200px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as OrderStatus | "all")
          }
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Sort orders"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="total_desc">Total: high → low</option>
          <option value="total_asc">Total: low → high</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Search
        </button>
        {searchQ ? (
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              setSearchQ("");
              setSearchDraft("");
              setStatusFilter("all");
              setSortKey("newest");
            }}
          >
            Clear
          </button>
        ) : null}
      </form>

      {banner && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            banner.kind === "ok"
              ? "border border-green-200 bg-green-50 text-green-900"
              : "border border-red-200 bg-red-50 text-red-900 whitespace-pre-wrap"
          }`}
        >
          {banner.text}
        </div>
      )}

      {ordersQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading orders…</p>
      ) : ordersQuery.isError ? (
        <p className="text-sm text-red-600">
          {getErrorMessage(ordersQuery.error, "Could not load orders.")}
        </p>
      ) : visibleRows.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
          No matching orders.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Lines</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleRows.map((o) => {
                const open = expanded.has(o.id);
                const draft = statusForRow(o);
                const dirty = draft !== o.status;
                const saving = savingId === o.id;

                return (
                  <Fragment key={o.id}>
                    <tr className="align-top hover:bg-gray-50/80">
                      <td className="px-3 py-2 font-mono text-xs">
                        <Link
                          href={`/modules/admin/orders/${o.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {o.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 max-w-[220px]">
                        <div className="break-words text-gray-900">
                          {customerLabel(o)}
                        </div>
                        <div
                          className="mt-0.5 text-[11px] text-gray-400 truncate"
                          title={o.paypalOrderId}
                        >
                          PayPal: {o.paypalOrderId}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {o.items.length}
                      </td>
                      <td className="px-3 py-2 font-medium tabular-nums">
                        {formatMoney(o.total, o.currency)}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="w-full max-w-[160px] rounded border border-gray-300 bg-white px-2 py-1 text-xs disabled:bg-gray-100"
                          value={draft}
                          disabled={!canUpdate && !canRefund}
                          onChange={(e) =>
                            setStatusDraft(o.id, e.target.value as OrderStatus)
                          }
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                        <Link
                          href={`/modules/admin/orders/${o.id}`}
                          className="inline-block rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                          onClick={() => toggleExpand(o.id)}
                        >
                          {open ? "Hide" : "Lines"}
                        </button>
                        <button
                          type="button"
                          className="rounded bg-black px-2 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
                          disabled={
                            !dirty || saving || !canSaveStatus(draft, o.status)
                          }
                          onClick={() => void saveStatus(o)}
                        >
                          {saving ? "…" : "Save"}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-gray-50/90">
                        <td colSpan={7} className="px-3 py-3">
                          <div className="text-xs font-medium text-gray-600 mb-2">
                            Line items (up to 8 loaded)
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-gray-500">
                                <th className="py-1 pr-2">Product</th>
                                <th className="py-1 pr-2">Qty</th>
                                <th className="py-1">Unit</th>
                                <th className="py-1">Line total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.items.map((line) => (
                                <tr key={line.id}>
                                  <td className="py-1 pr-2">
                                    <span className="text-gray-900">
                                      {line.title}
                                    </span>
                                    <span className="text-gray-400">
                                      {" "}
                                      · #{line.productId}
                                    </span>
                                  </td>
                                  <td className="py-1 pr-2 tabular-nums">
                                    {line.quantity}
                                  </td>
                                  <td className="py-1 tabular-nums">
                                    {formatMoney(line.unitPrice, o.currency)}
                                  </td>
                                  <td className="py-1 tabular-nums">
                                    {formatMoney(
                                      line.unitPrice * line.quantity,
                                      o.currency,
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {(o.shippingLine1 || o.shippingCity) && (
                            <div className="mt-3 text-xs text-gray-600">
                              <span className="font-medium text-gray-700">
                                Ship to:{" "}
                              </span>
                              {[
                                o.shippingLine1,
                                o.shippingCity,
                                o.shippingPostcode,
                                o.shippingCountry,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {ordersQuery.hasNextPage && (
        <button
          type="button"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={ordersQuery.isFetchingNextPage}
          onClick={() => void ordersQuery.fetchNextPage()}
        >
          {ordersQuery.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
