"use client";
import ProductGrid from '../ProductGrid/ProductGrid';
import { useRealtimeSWR } from '@/lib/hooks/useRealtimeSWR';

export default function ProductList({ categorySlug }: { categorySlug?: string }) {
  const url = categorySlug
    ? `/user/api/products?category=${encodeURIComponent(categorySlug)}`
    : '/user/api/products';

  const { data: products } = useRealtimeSWR({
    url,
    event: "products_updated",
    matchKey: (key) => typeof key === "string" && key.startsWith("/user/api/products"),
    swrOptions: {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
    },
  });

  if (!products) return <div>Loading...</div>;
  if (typeof products === 'object' && products !== null && 'error' in products) return <div>Products not found for this category.</div>;
  if (!Array.isArray(products)) return <div>No products found.</div>;
  return <ProductGrid products={products} />;
}
