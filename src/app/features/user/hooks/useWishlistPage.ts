"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { http } from "@/app/lib/network";
import { useUser } from "@/app/features/user/components/client/UserContext";

type WishlistItem = {
  id: number;
  productId: number;
  product: {
    id: number;
    title: string;
    slug: string;
    price: number;
    imageUrl: string | null;
    stock: number;
    isActive: boolean;
  };
};

async function fetchWishlist(): Promise<WishlistItem[]> {
  const { data } = await http.get<WishlistItem[]>(
    "/features/user/api/wishlist",
  );
  return Array.isArray(data) ? data : [];
}

// Page-level hook: loads wishlist and exposes a single remove action.
export function useWishlistPage() {
  const { user, isLoading: authLoading } = useUser();

  const query = useQuery({
    queryKey: ["user-wishlist"],
    queryFn: fetchWishlist,
    enabled: Boolean(user),
    staleTime: 5_000,
  });

  const items = query.data ?? [];
  const loading = authLoading || query.isLoading;
  const showSkeleton = loading && items.length === 0;

  const remove = useCallback(
    async (productId: number) => {
      await http.delete(
        `/features/user/api/wishlist?productId=${encodeURIComponent(
          String(productId),
        )}`,
      );
      await query.refetch();
    },
    [query],
  );

  return {
    user,
    authLoading,
    items,
    loading,
    showSkeleton,
    isError: query.isError,
    remove,
  };
}
