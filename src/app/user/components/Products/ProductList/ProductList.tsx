"use client";
import React, { useState, useEffect } from 'react';
import ProductGrid from '../ProductGrid/ProductGrid';
import { useRealtimeSWR } from '@/lib/hooks/useRealtimeSWR';

const PAGE_SIZE = 10;

export default function ProductList({ categorySlug }: { categorySlug?: string }) {
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const url = categorySlug
    ? `/user/api/products?category=${encodeURIComponent(categorySlug)}&limit=${PAGE_SIZE}&page=${page}`
    : `/user/api/products?limit=${PAGE_SIZE}&page=${page}`;

  const { data, mutate } = useRealtimeSWR({
    url,
    event: "products_updated",
    matchKey: (key) => typeof key === "string" && key.startsWith("/user/api/products"),
    swrOptions: {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
    },
  });

  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setProducts(Array.isArray(data) ? data : []);
    } else if (Array.isArray(data)) {
      setProducts(prev => [...prev, ...data]);
    }
    setHasMore(Array.isArray(data) && data.length === PAGE_SIZE);
    setIsLoading(false);
  }, [data, page]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    await mutate();
    setIsRefreshing(false);
  };

  const handleLoadMore = () => {
    setIsLoading(true);
    setPage(p => p + 1);
  };

  if (!products.length && isLoading) return (
    <div className="flex flex-col items-center justify-center py-8">
      <button className="px-4 py-2 bg-gray-300 text-gray-600 rounded flex items-center gap-2" disabled>
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
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
      {!hasMore && (
        <div className="flex justify-center text-gray-400 mt-4">No more products</div>
      )}
    </div>
  );
}
