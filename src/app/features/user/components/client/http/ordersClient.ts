import http from "@/app/utils/http";
import type { OrderListItem } from "@/app/features/user/types";

export type OrdersPageResponse = {
  orders: OrderListItem[];
  nextCursor: number | null;
};

export async function fetchOrdersPage(
  cursor?: number,
  limit = 40,
  status?: string,
): Promise<OrdersPageResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(limit));
  if (cursor != null) searchParams.set("cursor", String(cursor));
  if (status && status !== "all") searchParams.set("status", status);
  const { data: responsePayload } = await http.get<OrdersPageResponse>(
    `/features/user/api/orders?${searchParams.toString()}`,
  );
  return {
    orders: Array.isArray(responsePayload.orders) ? responsePayload.orders : [],
    nextCursor: responsePayload.nextCursor ?? null,
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
  const allOrders: OrderListItem[] = [];
  let cursor: number | undefined;
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const { orders, nextCursor } = await fetchOrdersPage(cursor, 50);
    allOrders.push(...orders);
    if (nextCursor == null) break;
    cursor = nextCursor;
  }
  return allOrders;
}
