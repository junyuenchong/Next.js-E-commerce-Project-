"use client";
import React from "react";
import ProductGrid from "@/app/features/user/components/client/Products/ProductGrid/ProductGrid";
import type { ProductCardProduct } from "@/app/features/user/types";
import { useProductList } from "@/app/features/user/hooks";

export default function ProductList({
  categorySlug,
  initialProducts,
}: {
  categorySlug?: string;
  /** First page from the server for SSR + SEO (HTML includes product grid). */
  initialProducts?: ProductCardProduct[];
}) {
  const { products, isLoading, hasMore, loadMore } = useProductList(
    categorySlug,
    initialProducts,
  );

  if (!products.length && isLoading)
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <button
          className="px-4 py-2 bg-gray-300 text-gray-600 rounded flex items-center gap-2"
          disabled
        >
          <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full inline-block"></span>
          Loading Products...
        </button>
      </div>
    );
  if (!products.length) return <div>No products found.</div>;
  return (
    <div className="space-y-4">
      <ProductGrid products={products} />
      {hasMore && (
        <div className="flex justify-center mb-5">
          <button
            onClick={loadMore}
            className="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full inline-block"></span>
            ) : null}
            {isLoading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
      {!hasMore && (
        <div className="flex justify-center text-gray-400 mt-4">
          No more products
        </div>
      )}
    </div>
  );
}
