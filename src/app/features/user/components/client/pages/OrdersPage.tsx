"use client";

/** Signed-in user order history. */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  fetchAllUserOrders,
  fetchOrdersPage,
} from "@/app/features/user/components/client/http";
import { useUser } from "@/app/features/user/components/client/UserContext";
import { formatPriceRM } from "@/app/lib/format-price";
import { getUserOrderStatusLabel } from "@/app/lib/order-status";
import type { OrderListItem } from "@/app/features/user/types";

export default function OrdersPage() {
  const { user } = useUser();
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Loads the first page of orders (used on mount and after realtime refresh).
  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const { orders: initialOrders, nextCursor: nextPageCursor } =
        await fetchOrdersPage(undefined, 40, statusFilter);
      setOrders(initialOrders);
      setNextCursor(nextPageCursor);
      setError(null);
    } catch {
      setOrders(null);
      setError("Could not load orders. Try signing in again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Fetches the next cursor page and appends results to the existing list.
  const loadMore = useCallback(async () => {
    if (nextCursor == null) return;
    try {
      setLoadingMore(true);
      const { orders: nextOrders, nextCursor: nextPageCursor } =
        await fetchOrdersPage(nextCursor, 40, statusFilter);
      setOrders((prev) => [...(prev ?? []), ...nextOrders]);
      setNextCursor(nextPageCursor);
    } catch {
      setError("Could not load more orders.");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, statusFilter]);

  // Clears state when signed out, otherwise triggers initial load.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setOrders(null);
      setNextCursor(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      if (!cancelled) await loadInitial();
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loadInitial]);

  // Reload list when filter changes (Shopee-like status tabs / dropdown).
  useEffect(() => {
    if (!user) return;
    void loadInitial();
  }, [statusFilter, user, loadInitial]);

  // Subscribes to order status updates (SSE) and refreshes the list on change.
  useEffect(() => {
    if (!user) return;
    const eventSource = new EventSource(
      "/features/user/api/events?channels=orders",
    );
    const onMessage = () => {
      void fetchAllUserOrders().then((data) => {
        setOrders(data);
        setNextCursor(null);
      });
    };
    eventSource.addEventListener("message", onMessage);
    return () => {
      eventSource.removeEventListener("message", onMessage);
      eventSource.close();
    };
  }, [user]);

  const visibleOrders = orders ?? [];
  const showSkeleton = loading && visibleOrders.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your orders</h1>
        <p className="text-sm text-gray-600 mb-8">
          Status updates appear here after checkout (PayPal). Admin workflow for
          shipped/delivered can extend these states later.
        </p>

        {!user ? (
          <div className="min-h-[520px] rounded-lg bg-white p-8 text-center text-gray-600 shadow-sm">
            <p className="mb-4">Sign in to see order history.</p>
            <Link
              href="/features/user/auth/sign-in?returnUrl=/features/user/orders"
              className="inline-flex rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
            >
              Sign in
            </Link>
          </div>
        ) : error && orders == null ? (
          <div className="min-h-[520px] rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="mb-4 text-red-700">{error}</p>
            <Link
              href="/features/user"
              className="text-blue-600 hover:underline"
            >
              Back to shop
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 min-h-[24px]">
              {error ? <p className="text-sm text-amber-800">{error}</p> : null}
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-medium text-gray-900">
                Filter by status
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  const v = e.target.value;
                  setStatusFilter(v);
                  setOrders(null);
                  setNextCursor(null);
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending payment</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="fulfilled">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="min-h-[520px]">
              {showSkeleton ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`orders-skeleton-${idx}`}
                      className="h-[124px] animate-pulse rounded-lg border border-gray-100 bg-white p-5"
                    />
                  ))}
                </div>
              ) : visibleOrders.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
                  <p className="mb-4">No orders yet.</p>
                  <Link
                    href="/features/user"
                    className="text-blue-600 font-medium hover:underline"
                  >
                    Start shopping
                  </Link>
                </div>
              ) : (
                <>
                  <ul className="space-y-4">
                    {visibleOrders.map((orderItem) => (
                      <li key={orderItem.id}>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:border-gray-200 hover:shadow transition">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">
                                Order #{orderItem.id}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(orderItem.createdAt).toLocaleString()}
                              </p>
                              {orderItem.paypalOrderId ? (
                                <p className="text-xs text-gray-400 mt-1 font-mono truncate max-w-xs">
                                  PayPal: {orderItem.paypalOrderId}
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-blue-600">
                                {formatPriceRM(orderItem.total)}
                                {orderItem.currency &&
                                orderItem.currency !== "MYR"
                                  ? ` ${orderItem.currency}`
                                  : ""}
                              </p>
                              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                                {getUserOrderStatusLabel(orderItem.status)}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <Link
                              href={`/features/user/orders/${encodeURIComponent(orderItem.id)}`}
                              className="text-xs font-medium text-blue-600 hover:underline"
                            >
                              View details
                            </Link>
                            {String(orderItem.status).toLowerCase() ===
                            "pending" ? (
                              <Link
                                href="/features/user/checkout"
                                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                Pay again
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {nextCursor != null && (
                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        disabled={loadingMore}
                        onClick={() => void loadMore()}
                        className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {loadingMore ? "Loading…" : "Load older orders"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
