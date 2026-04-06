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
  const [products, setProducts] = useState<Product[]>(initialProducts ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [cursor, setCursor] = useState<number | null>(() => {
    const list = initialProducts ?? [];
    return list.length > 0 ? list[list.length - 1].id : null;
  });
  const [hasMore, setHasMore] = useState(() =>
    initialProducts != null && initialProducts.length > 0
      ? initialProducts.length === PAGE_SIZE
      : true,
  );

  const url = useMemo(() => {
    const cursorPart =
      cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : "";
    return categorySlug
      ? `/user/api/products?category=${encodeURIComponent(
          categorySlug,
        )}&limit=${PAGE_SIZE}${cursorPart}`
      : `/user/api/products?limit=${PAGE_SIZE}${cursorPart}`;
  }, [categorySlug, cursor]);

  const { data } = useRealtimeQuery(
    qk.user.productsList(categorySlug ?? null, cursor),
    async () => {
      const res = await fetch(url);
      return res.json();
    },
    {
      channels: "products",
      initialData:
        (initialProducts ?? []).length > 0 &&
        cursor === (initialProducts ?? []).slice(-1)[0]?.id
          ? { items: initialProducts, nextCursor: cursor }
          : undefined,
      // Render fallback when SSE is unstable/unavailable.
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  );

  useEffect(() => {
    if (!data) return;
    const items = Array.isArray(data)
      ? data
      : (data as { items?: Product[] })?.items;
    const nextCursor =
      !Array.isArray(data) && data && typeof data === "object"
        ? ((data as { nextCursor?: number | null }).nextCursor ?? null)
        : null;

    if (Array.isArray(items)) {
      setProducts((prev) => (cursor == null ? items : [...prev, ...items]));
      setHasMore(items.length === PAGE_SIZE);
      setCursor(
        nextCursor ?? (items.length > 0 ? items[items.length - 1].id : null),
      );
    }
    setIsLoading(false);
  }, [data, cursor]);

  const handleLoadMore = useCallback(() => {
    setIsLoading(true);
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
