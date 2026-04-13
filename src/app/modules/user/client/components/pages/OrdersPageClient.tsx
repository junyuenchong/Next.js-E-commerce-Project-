"use client";

/** Signed-in user order history. */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchAllUserOrders, fetchOrdersPage } from "@/app/modules/user/client";
import { useUser } from "@/app/modules/user/client/components/UserContext";
import { formatPriceRM } from "@/app/lib/format-price";
import type { OrderListItem } from "@/app/modules/user/types";

function statusLabel(s: OrderListItem["status"]): string {
  switch (s) {
    case "pending":
      return "Pending";
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
      return s;
  }
}

export default function OrdersPage() {
  const { user } = useUser();
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const { orders: list, nextCursor: c } = await fetchOrdersPage(
        undefined,
        40,
      );
      setOrders(list);
      setNextCursor(c);
      setError(null);
    } catch {
      setOrders(null);
      setError("Could not load orders. Try signing in again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (nextCursor == null) return;
    try {
      setLoadingMore(true);
      const { orders: more, nextCursor: c } = await fetchOrdersPage(
        nextCursor,
        40,
      );
      setOrders((prev) => [...(prev ?? []), ...more]);
      setNextCursor(c);
    } catch {
      setError("Could not load more orders.");
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor]);

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

  useEffect(() => {
    if (!user) return;
    const es = new EventSource("/modules/user/api/events?channels=orders");
    const onMsg = () => {
      void fetchAllUserOrders().then((data) => {
        setOrders(data);
        setNextCursor(null);
      });
    };
    es.addEventListener("message", onMsg);
    return () => {
      es.removeEventListener("message", onMsg);
      es.close();
    };
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-16 px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your orders</h1>
        <p className="text-gray-600 mb-6">Sign in to see order history.</p>
        <Link
          href="/modules/user/auth/sign-in?returnUrl=/modules/user/orders"
          className="inline-flex px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && orders == null) {
    return (
      <div className="min-h-screen bg-gray-50 py-16 px-4 text-center">
        <p className="text-red-700 mb-4">{error}</p>
        <Link href="/modules/user" className="text-blue-600 hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  const list = orders ?? [];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your orders</h1>
        <p className="text-sm text-gray-600 mb-8">
          Status updates appear here after checkout (PayPal). Admin workflow for
          shipped/delivered can extend these states later.
        </p>

        {error && <p className="text-sm text-amber-800 mb-4">{error}</p>}

        {list.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
            <p className="mb-4">No orders yet.</p>
            <Link
              href="/modules/user"
              className="text-blue-600 font-medium hover:underline"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-4">
              {list.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/modules/user/orders/${encodeURIComponent(o.id)}`}
                    className="block bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:border-gray-200 hover:shadow transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Order #{o.id}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(o.createdAt).toLocaleString()}
                        </p>
                        {o.paypalOrderId ? (
                          <p className="text-xs text-gray-400 mt-1 font-mono truncate max-w-xs">
                            PayPal: {o.paypalOrderId}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-blue-600">
                          {formatPriceRM(o.total)}
                          {o.currency && o.currency !== "MYR"
                            ? ` ${o.currency}`
                            : ""}
                        </p>
                        <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                          {statusLabel(o.status)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      View details
                    </div>
                  </Link>
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
    </div>
  );
}
