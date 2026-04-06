import type { Metadata } from "next";
import type { Product } from "@prisma/client";
import { Suspense } from "react";
import ProductList from "@/app/user/components/Products/ProductList/ProductList";
import SalesCampaignBanner from "./components/SalesCampaignBanner/SalesCampaignBanner";
import Loading from "./loading";
import { getAllProducts } from "@/actions/product";

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
  const initialProducts = await getAllProducts(10, 1);
  const list = (
    Array.isArray(initialProducts) ? initialProducts : []
  ) as Product[];
  return <ProductList initialProducts={list} />;
}

const Home = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 mt-4 sm:mt-6 sm:mb-6 text-center">
        Products
      </h2>
      <SalesCampaignBanner />
      <Suspense fallback={<Loading />}>
        <HomeProducts />
      </Suspense>
    </div>
  );
};

export default Home;
