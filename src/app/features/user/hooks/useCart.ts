"use client";

import { useQuery } from "@tanstack/react-query";
import { useRealtimeInvalidate } from "@/app/lib/query/useRealtimeQuery";
import { fetchCart } from "@/app/features/user/components/client/http";

/** Stable query key for cart + realtime invalidation. */
export const USER_CART_QUERY_KEY = ["user-cart"] as const;

export function useCart() {
  useRealtimeInvalidate(USER_CART_QUERY_KEY, { channels: "products" });

  const query = useQuery({
    queryKey: USER_CART_QUERY_KEY,
    queryFn: () => fetchCart(),
    // Keep cart data fresh so cross-page/tab updates do not hide recently added items.
    staleTime: 5_000,
    gcTime: 5 * 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    cart: query.data,
    isLoading: query.isLoading,
    error: query.error,
    mutate: query.refetch,
  };
}
