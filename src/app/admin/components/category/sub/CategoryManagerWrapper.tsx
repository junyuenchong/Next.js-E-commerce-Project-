"use client";

import useSWR from "swr";
import CategoryManager, { CategoryManagerProps } from "../main/CategoryManager";
import { useEffect } from "react";

// Omit 'categories' from props for the wrapper
export type CategoryManagerWrapperProps = Omit<CategoryManagerProps, 'categories'>;

const fetcher = async () => {
  const res = await fetch('/admin/api/categories');
  if (!res.ok) throw new Error('Failed to fetch categories');
  const data = await res.json();
  console.log('Fetched categories:', data); // Debug log
  return data;
};

export default function CategoryManagerWrapper(props: CategoryManagerWrapperProps) {
  const { data: categories = [], error, isLoading, mutate } = useSWR(
    'admin-categories',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 2000,
      refreshInterval: 0, // Disable auto-refresh
    }
  );

  useEffect(() => {
    console.log('[DEBUG] Current categories in CategoryManagerWrapper:', categories);
  }, [categories]);

  const handleRefresh = async () => {
    console.log('🔄 Refreshing admin categories...');
    try {
      await mutate(undefined, { revalidate: true });
      console.log('✅ Admin categories refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh admin categories:', error);
    }
  };

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
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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

  const categoriesWithDates = Array.isArray(categories)
    ? categories.map(cat => ({
        ...cat,
        createdAt: cat.createdAt ? new Date(cat.createdAt) : undefined,
        updatedAt: cat.updatedAt ? new Date(cat.updatedAt) : undefined,
      }))
    : [];

  return (
    <CategoryManager
      {...props}
      categories={categoriesWithDates}
      onRefresh={handleRefresh}
    />
  );
}
