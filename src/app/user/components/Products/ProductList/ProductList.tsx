"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ProductGrid from "../ProductGrid/ProductGrid";
import { Product } from "@prisma/client";
import { useRealtimeQuery } from "@/lib/hooks/useRealtimeQuery";
import { qk } from "@/lib/query-keys";

const PAGE_SIZE = 10;

export default function ProductList({
  categorySlug,
  initialProducts,
}: {
  categorySlug?: string;
  /** First page from the server for SSR + SEO (HTML includes product grid). */
  initialProducts?: Product[];
}) {
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(() =>
    initialProducts != null && initialProducts.length > 0
      ? initialProducts.length === PAGE_SIZE
      : true,
  );

  const url = useMemo(() => {
    return categorySlug
      ? `/user/api/products?category=${encodeURIComponent(categorySlug)}&limit=${PAGE_SIZE}&page=${page}`
      : `/user/api/products?limit=${PAGE_SIZE}&page=${page}`;
  }, [categorySlug, page]);

  const { data } = useRealtimeQuery(
    qk.user.productsList(categorySlug ?? null, page),
    async () => {
      const res = await fetch(url);
      return res.json();
    },
    {
      channels: "products",
      initialData: page === 1 ? initialProducts : undefined,
      // Render fallback when SSE is unstable/unavailable.
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  );

  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setProducts(Array.isArray(data) ? data : []);
    } else if (Array.isArray(data)) {
      setProducts((prev) => [...prev, ...data]);
    }
    setHasMore(Array.isArray(data) && data.length === PAGE_SIZE);
    setIsLoading(false);
  }, [data, page]);

  const handleLoadMore = useCallback(() => {
    setIsLoading(true);
    setPage((p) => p + 1);
  }, []);

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
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
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
