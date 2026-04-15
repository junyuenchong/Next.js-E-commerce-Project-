import http from "@/app/lib/http";
import type { OrderListItem } from "@/app/modules/user/types";

export type OrdersPageResponse = {
  orders: OrderListItem[];
  nextCursor: number | null;
};

export async function fetchOrdersPage(
  cursor?: number,
  limit = 40,
): Promise<OrdersPageResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor != null) params.set("cursor", String(cursor));
  const { data } = await http.get<OrdersPageResponse>(
    `/modules/user/api/orders?${params.toString()}`,
  );
  return {
    orders: Array.isArray(data.orders) ? data.orders : [],
    nextCursor: data.nextCursor ?? null,
  };
}

/** First page only (backward compatible for simple callers). */
export async function fetchOrders(): Promise<OrderListItem[]> {
  const { orders } = await fetchOrdersPage();
  return orders;
}

/** Refetch all pages (e.g. SSE refresh); caps pages to avoid runaway. */
export async function fetchAllUserOrders(
  maxPages = 25,
): Promise<OrderListItem[]> {
  const out: OrderListItem[] = [];
  let cursor: number | undefined;
  for (let i = 0; i < maxPages; i++) {
    const { orders, nextCursor } = await fetchOrdersPage(cursor, 50);
    out.push(...orders);
    if (nextCursor == null) break;
    cursor = nextCursor;
  }
  return out;
}
