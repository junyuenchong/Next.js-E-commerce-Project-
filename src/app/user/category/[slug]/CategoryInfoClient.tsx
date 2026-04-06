"use client";
import React, { memo } from "react";
import type { Category, Product } from "@prisma/client";
import SalesCampaignBanner from "../../components/SalesCampaignBanner/SalesCampaignBanner";
import ProductList from "@/app/user/components/Products/ProductList/ProductList";
import { useRealtimeQuery } from "@/lib/hooks/useRealtimeQuery";

const CategoryInfoClient = memo(function CategoryInfoClient({
  slug,
  initialCategory,
  initialProducts,
}: {
  slug: string;
  initialCategory?: Category;
  initialProducts?: Product[];
}) {
  const { data: category } = useRealtimeQuery(
    ["user-category", slug],
    async () => {
      const res = await fetch(`/user/api/categories/${slug}`);
      return res.json();
    },
    {
      channels: "categories",
      initialData: initialCategory,
      // Fallback for hosts where SSE is unstable/unavailable.
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  );

  const cat = (category as Category | undefined) ?? initialCategory;
  if (!cat || typeof cat !== "object" || "error" in cat)
    return <div>Category not found</div>;

  return (
    <div>
      <div className="bg-red-50 p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-red-600 mb-2">
            {cat.name} - UP TO 90% OFF! 🔥
          </h1>
          <p className="text-center text-red-500 text-sm md:text-base animate-pulse">
            ⚡️ Flash Sale Ending Soon! ⏰ Limited Time Only
          </p>
        </div>
      </div>
      <SalesCampaignBanner />
      <section className="container mx-auto py-8">
        <ProductList categorySlug={slug} initialProducts={initialProducts} />
      </section>
    </div>
  );
});

export default CategoryInfoClient;
