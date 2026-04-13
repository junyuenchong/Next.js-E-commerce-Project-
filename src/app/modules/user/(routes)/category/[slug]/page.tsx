/** Category PLP by URL slug. */
import type { Metadata } from "next";
import type { Category } from "@prisma/client";
import { notFound } from "next/navigation";
import type { ProductCardProduct } from "@/app/modules/user/types";
import {
  getCategoryBySlug,
  getProductsByCategorySlug,
} from "@/backend/modules/category";
import { serializeProductCardListForClient } from "@/app/lib/serialize-product-card";
import CategoryInfoClient from "@/app/modules/user/client/components/category/CategoryInfoClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: "Category" };
  try {
    const category = (await getCategoryBySlug(slug)) as Category;
    const description = `Shop ${category.name} products with deals and fast delivery at CJY E-Commerce.`;
    return {
      title: category.name,
      description,
      openGraph: {
        title: `${category.name} | CJY E-Commerce`,
        description,
      },
    };
  } catch (error: unknown) {
    console.error("[category page] metadata load failed", error);
    return { title: "Category not found" };
  }
}

const CategoryPage = async ({
  params,
}: {
  params?: Promise<{ slug?: string }>;
}) => {
  const resolvedParams = params ? await params : {};
  const slug = resolvedParams.slug;
  if (!slug) notFound();

  try {
    const [category, initialProducts] = await Promise.all([
      getCategoryBySlug(slug),
      getProductsByCategorySlug(slug, 10, 1),
    ]);
    return (
      <CategoryInfoClient
        slug={slug}
        initialCategory={category as Category}
        initialProducts={serializeProductCardListForClient(
          Array.isArray(initialProducts)
            ? (initialProducts as ProductCardProduct[])
            : [],
        )}
      />
    );
  } catch (error: unknown) {
    console.error("[category page] page load failed", error);
    notFound();
  }
};

export default CategoryPage;
