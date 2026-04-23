/**
 * storefront home page
 * show featured products and banner
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import ProductList from "@/app/features/user/components/client/Products/ProductList/ProductList";
import type { ProductCardProduct } from "@/app/features/user/types";
import SalesCampaignBanner from "@/app/features/user/components/client/SalesCampaignBanner/SalesCampaignBanner";
import ShopLoadingFallback from "@/app/features/user/components/shared/ShopLoadingFallback";
import { serializeProductCardListForClient } from "@/app/lib/product";
import { listProductsService } from "@/backend/modules/product";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse products with flash deals, free shipping on qualifying orders, and fast delivery at CJY E-Commerce.",
  openGraph: {
    title: "Shop | CJY E-Commerce",
    description:
      "Browse products with flash deals and fast delivery at CJY E-Commerce.",
  },
};

async function HomeProducts() {
  const initialProducts = await listProductsService(10, 1);
  const raw = (
    Array.isArray(initialProducts) ? initialProducts : []
  ) as ProductCardProduct[];
  const list = serializeProductCardListForClient(raw);
  return <ProductList initialProducts={list} />;
}

const Home = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 mt-4 sm:mt-6 sm:mb-6 text-center">
        Products
      </h2>
      <SalesCampaignBanner />
      <Suspense fallback={<ShopLoadingFallback />}>
        <HomeProducts />
      </Suspense>
    </div>
  );
};

export default Home;
