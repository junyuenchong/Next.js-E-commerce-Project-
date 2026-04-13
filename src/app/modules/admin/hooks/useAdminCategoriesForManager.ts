"use client";

import { useCallback, useMemo } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/app/lib/query-keys";
import type { Category } from "@/app/modules/admin/types";
import { fetchAdminCategories } from "@/app/modules/admin/client";
import { useRealtimeInvalidate } from "./useRealtimeQuery";

export function useAdminCategoriesForManager() {
  const queryClient = useQueryClient();
  const query = useQuery<Category[]>({
    queryKey: qk.admin.categories(),
    queryFn: fetchAdminCategories,
    staleTime: 2000,
  });
  const categories = useMemo(() => query.data ?? [], [query.data]);

  useRealtimeInvalidate(qk.admin.categories(), {
    eventsUrl: "/modules/admin/api/events/categories",
    matchKey: (key: QueryKey) =>
      Array.isArray(key) &&
      key[0] === "categories" &&
      key[1] === "list" &&
      (key[2] as { scope?: string } | undefined)?.scope === "admin",
  });

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
