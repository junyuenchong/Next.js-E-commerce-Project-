import type { Metadata } from "next";
import type { Product } from "@prisma/client";
import { Suspense } from "react";
import React from "react";
import SalesCampaignBanner from "../components/SalesCampaignBanner/SalesCampaignBanner";
import ProductGrid from "../components/Products/ProductGrid/ProductGrid";
import { searchProducts } from "@/actions/product";
import Loading from "../loading";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>;
}): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  const q = (params.query ?? "").trim();
  const title = q ? `Search: ${q}` : "Search";
  const description = q
    ? `Search results for “${q}” — deals and fast delivery at CJY E-Commerce.`
    : "Search products at CJY E-Commerce.";
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: { title: `${title} | CJY E-Commerce`, description },
  };
}

// Async component for search content with data
async function SearchContentWithData({ query }: { query: string }) {
  try {
    const productsRaw = await searchProducts(query);
    const products = (
      Array.isArray(productsRaw) ? productsRaw : []
    ) as Product[];

    return (
      <>
        <div className="bg-red-50 p-4">
          <div className="container mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-center text-red-600 mb-2">
              Search Results for &quot;{query || "All Products"}&quot; - UP TO
              90% OFF! 🔥
            </h1>
            <p className="text-center text-red-500 text-sm md:text-base animate-pulse">
              ⚡️ Flash Sale Ending Soon! ⏰ Limited Time Only
            </p>
            <p className="text-center text-gray-600 text-xs mt-2">
              Discover amazing deals matching your search
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 py-3">
          <div className="container mx-auto">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">🚚</span>
                <span>Free Shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">⭐️</span>
                <span>Top Rated</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">💰</span>
                <span>Best Prices</span>
              </div>
            </div>
          </div>
        </div>

        <section className="container mx-auto py-8">
          <div className="text-center mb-8">
            <p className="text-sm text-gray-500">
              🎉 {products.length} Amazing Deals Available Now!
            </p>
          </div>

          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No products found</p>
              <p className="text-gray-400 text-sm">
                Try searching with different keywords
              </p>
            </div>
          )}
        </section>
      </>
    );
  } catch (error) {
    console.error("[SearchPage] Error:", error);
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">
            ⚠️ Error loading search results
          </p>
          <p className="text-gray-500 text-sm">Please try again later</p>
        </div>
      </div>
    );
  }
}

const SearchPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string }>;
}) => {
  try {
    const params = searchParams ? await searchParams : {};
    const { query } = params;

    return (
      <div>
        <SalesCampaignBanner />
        <Suspense fallback={<Loading />}>
          <SearchContentWithData query={query || ""} />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error("[SearchPage] Error:", error);
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">⚠️ Error loading page</p>
          <p className="text-gray-500 text-sm">Please try again later</p>
        </div>
      </div>
    );
  }
};

export default SearchPage;
