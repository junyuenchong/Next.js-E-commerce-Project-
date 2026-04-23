"use client";

/**
 * admin categories hook
 * load categories and keep cache fresh
 */

import { useCallback, useMemo } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/app/lib/realtime";
import type { Category } from "@/app/features/admin/types";
import { fetchAdminCategories } from "@/app/lib/api/admin";
import { useRealtimeInvalidate } from "./useRealtimeQuery";

// Provides category data, refresh, and realtime invalidation.
export function useAdminCategoriesForManager() {
  const queryClient = useQueryClient();
  const query = useQuery<Category[]>({
    queryKey: qk.admin.categories(),
    queryFn: fetchAdminCategories,
    staleTime: 2000,
  });
  const categories = useMemo(() => query.data ?? [], [query.data]);

  useRealtimeInvalidate(qk.admin.categories(), {
    eventsUrl: "/features/admin/api/events/categories",
    matchKey: (key: QueryKey) =>
      Array.isArray(key) &&
      key[0] === "categories" &&
      key[1] === "list" &&
      (key[2] as { scope?: string } | undefined)?.scope === "admin",
  });

  // Manual refresh action for category list.
  const handleRefresh = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: qk.admin.categories() });
    } catch (error: unknown) {
      console.error("Failed to refresh admin categories:", error);
    }
  }, [queryClient]);

  const categoriesWithDates: Category[] = useMemo(
    () =>
      categories.map((cat) => ({
        ...cat,
        createdAt: cat.createdAt ? new Date(cat.createdAt) : new Date(),
        updatedAt: cat.updatedAt ? new Date(cat.updatedAt) : new Date(),
      })),
    [categories],
  );

  return {
    categoriesWithDates,
    isLoading: query.isLoading,
    error: query.error,
    handleRefresh,
    isEmpty: categories.length === 0,
  };
}
