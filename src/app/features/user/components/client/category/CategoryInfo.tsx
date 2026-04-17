"use client";

import React, { memo } from "react";
import type { Category } from "@prisma/client";
import SalesCampaignBanner from "@/app/features/user/components/client/SalesCampaignBanner/SalesCampaignBanner";
import ProductList from "@/app/features/user/components/client/Products/ProductList/ProductList";
import { useCategoryDetail } from "@/app/features/user/hooks";
import type { ProductCardProduct } from "@/app/features/user/types";

const CategoryInfo = memo(function CategoryInfo({
  slug,
  initialCategory,
  initialProducts,
}: {
  slug: string;
  initialCategory?: Category;
  initialProducts?: ProductCardProduct[];
}) {
  const { data: category } = useCategoryDetail(slug, initialCategory);

  const cat = (category as Category | undefined) ?? initialCategory;
  if (!cat || typeof cat !== "object" || "error" in cat) {
    return <div>Category not found</div>;
  }

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

export default CategoryInfo;
