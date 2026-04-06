"use client";

import { useCallback, useMemo } from "react";
import CategoryManager, { CategoryManagerProps } from "../main/CategoryManager";
import { useAdminResourceSSE } from "@/app/admin/hooks/useAdminResourceSSE";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Category } from "../types/CategoryItem";

// Omit 'categories' from props for the wrapper
export type CategoryManagerWrapperProps = Omit<
  CategoryManagerProps,
  "categories"
>;

const fetcher = async () => {
  const res = await fetch("/admin/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
};

export default function CategoryManagerWrapper(
  props: CategoryManagerWrapperProps,
) {
  const queryClient = useQueryClient();
  const query = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: fetcher,
    staleTime: 2000,
  });
  const categories = useMemo(() => query.data ?? [], [query.data]);
  const error = query.error;
  const isLoading = query.isLoading;

  const handleSSEEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
  }, [queryClient]);
  useAdminResourceSSE("/admin/api/events/categories", handleSSEEvent);

  const handleRefresh = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (error) {
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

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading categories...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">
              Failed to load categories. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CategoryManager
      {...props}
      categories={categoriesWithDates}
      onRefresh={handleRefresh}
    />
  );
}
