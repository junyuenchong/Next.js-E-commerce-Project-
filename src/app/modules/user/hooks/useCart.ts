"use client";

import { useQuery } from "@tanstack/react-query";
import { useRealtimeInvalidate } from "@/app/lib/query/useRealtimeQuery";
import { fetchCart } from "@/app/modules/user/components/client/http";

/** Stable query key for cart + realtime invalidation. */
export const USER_CART_QUERY_KEY = ["user-cart"] as const;

export function useCart() {
  useRealtimeInvalidate(USER_CART_QUERY_KEY, { channels: "products" });

  const query = useQuery({
    queryKey: USER_CART_QUERY_KEY,
    queryFn: () => fetchCart(),
    refetchOnWindowFocus: true,
  });

  return {
    cart: query.data,
    isLoading: query.isLoading,
    error: query.error,
    mutate: query.refetch,
  };
}
