"use client";

import useSWR from "swr";
import axios from "axios";
import { Product } from "@prisma/client";
import ProductGrid from "../ProductGrid/ProductGrid";

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

type ProductListProps = {
  products?: Product[];
};

const ProductList = ({ products }: ProductListProps) => {
  const {
    data: swrProducts,
    isLoading,
  } = useSWR<Product[]>("/user/api/products", fetcher, {
    refreshInterval: 5000,
    // only fetch if products prop is not provided
    revalidateOnMount: !products,
    revalidateOnFocus: !products,
  });

  const finalProducts = products ?? swrProducts;

  if (!finalProducts || isLoading) return <div>Loading...</div>;
  if (finalProducts.length === 0) return <div>No products found.</div>;

  return (
    <div className="bg-white rounded-lg overflow-hidden p-4">
      <div className="max-w-[1600px] mx-auto">
        <ProductGrid products={finalProducts} />
      </div>
    </div>
  );
};

export default ProductList;
