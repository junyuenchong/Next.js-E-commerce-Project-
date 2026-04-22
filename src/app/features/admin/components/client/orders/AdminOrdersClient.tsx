"use client";

import { OrderStatus } from "@prisma/client";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { useAdminResourceSSE } from "@/app/features/admin/shared";

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
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { email: string | null; name: string | null } | null;
  items: OrderLine[];
};

type OrdersPage = { orders: AdminOrderRow[]; nextCursor: number | null };
type StockMutationAction = "NONE" | "DEDUCT" | "RESTOCK";
type OrderStatusUpdateResponse = AdminOrderRow & {
  stockMutation?: StockMutationAction;
};

type Me = {
  can: { orderRead: boolean; orderUpdate: boolean; orderRefund: boolean };
};

const ORDERS_PATH = "/features/admin/api/orders";
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

function adminOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Payment pending";
    case "paid":
      return "Paid";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "fulfilled":
      return "Fulfilled";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

async function fetchAdminMe(): Promise<Me> {
  const { data } = await http.get<Me>("/features/admin/api/me");
  return data;
}

// Fetch one cursor page from the admin orders endpoint.
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

// Format money safely with a currency fallback.
function formatMoney(amount: number, currency: string) {
  try {
    // Note: Malaysia-first formatting (still respects passed currency code).
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// Build customer label from user snapshot fields.
function customerLabel(orderRow: AdminOrderRow) {
  const email = orderRow.user?.email ?? orderRow.emailSnapshot;
  const name = orderRow.user?.name;
  if (email && name) return `${name} · ${email}`;
  if (email) return email;
  return "Guest / no email";
}

type SortKey =
  | "newestFirst"
  | "oldestFirst"
  | "totalHighToLow"
  | "totalLowToHigh";

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
  const [sortKey, setSortKey] = useState<SortKey>("newestFirst");

  // Feature: keep admin permissions responsive without constant refetch jitter.
  // Guard: login/logout path explicitly clears this cache to prevent role bleed.
  // Note: short stale window smooths route switches inside one active session.
  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchAdminMe,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
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

  useAdminResourceSSE(
    "/features/admin/api/events/orders",
    () => {
      void ordersQuery.refetch();
    },
    15000,
  );

  const rows = useMemo(
    () => ordersQuery.data?.pages.flatMap((p) => p.orders) ?? [],
    [ordersQuery.data?.pages],
  );

  // Debounced search-as-you-type (still supports enter-to-search form).
  // Debounce search input before querying.
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
        : rows.filter((orderRow) => orderRow.status === statusFilter);
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "oldestFirst":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "totalHighToLow":
          return b.total - a.total;
        case "totalLowToHigh":
          return a.total - b.total;
        case "newestFirst":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
    return sorted;
  }, [rows, sortKey, statusFilter]);

  // Toggle expanded state for a row.
  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Resolve row status from draft override or original value.
  const statusForRow = useCallback(
    (orderRow: AdminOrderRow) => draftStatus[orderRow.id] ?? orderRow.status,
    [draftStatus],
  );

  // Update status draft for a single order row.
  const setStatusDraft = useCallback((orderId: number, status: OrderStatus) => {
    setDraftStatus((d) => ({ ...d, [orderId]: status }));
  }, []);

  // Persist status change after permission checks.
  const saveStatus = useCallback(
    async (orderRow: AdminOrderRow) => {
      const next = statusForRow(orderRow);
      if (next === orderRow.status) {
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

      setSavingId(orderRow.id);
      setBanner(null);
      try {
        const { data: updatedOrder } =
          await http.patch<OrderStatusUpdateResponse>(ORDERS_PATH, {
            orderId: orderRow.id,
            status: next,
          });
        setDraftStatus((d) => {
          const copy = { ...d };
          delete copy[orderRow.id];
          return copy;
        });
        await ordersQuery.refetch();
        const stockHint =
          updatedOrder.stockMutation && updatedOrder.stockMutation !== "NONE"
            ? ` Inventory: ${updatedOrder.stockMutation}.`
            : "";
        setBanner({
          kind: "ok",
          text: `Order #${orderRow.id} updated to ${next}.${stockHint}`,
        });
      } catch (error) {
        setBanner({
          kind: "err",
          text: getErrorMessage(error, "Update failed"),
        });
      } finally {
        setSavingId(null);
      }
    },
    [canRefund, canUpdate, ordersQuery, statusForRow],
  );

  // Decide whether save action is allowed for this transition.
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
              {adminOrderStatusLabel(s)}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Sort orders"
        >
          <option value="newestFirst">Newest First</option>
          <option value="oldestFirst">Oldest First</option>
          <option value="totalHighToLow">Total High to Low</option>
          <option value="totalLowToHigh">Total Low to High</option>
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
              setSortKey("newestFirst");
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
                          href={`/features/admin/orders/${o.id}`}
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
                              {adminOrderStatusLabel(s)}
                            </option>
                          ))}
                        </select>
                        <div
                          className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            o.status === "fulfilled"
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : o.status === "cancelled"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : o.status === "delivered"
                                  ? "border-violet-200 bg-violet-50 text-violet-700"
                                  : o.status === "shipped"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {o.status === "fulfilled"
                            ? "Fulfilled"
                            : o.status === "cancelled"
                              ? "Cancelled"
                              : o.status === "delivered"
                                ? "Delivered"
                                : o.status === "shipped"
                                  ? "Shipped"
                                  : o.status === "processing"
                                    ? "Processing"
                                    : "Payment pending"}
                        </div>
                      </td>
                      <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                        <Link
                          href={`/features/admin/orders/${o.id}`}
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
