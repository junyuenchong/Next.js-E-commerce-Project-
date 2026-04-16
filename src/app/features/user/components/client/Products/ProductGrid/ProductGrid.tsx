"use client";

import React from "react";
import ProductCard from "../ProductCard/ProductCard";
import type { ProductCardProduct } from "@/app/features/user/types";

type ProductGridProps = {
  products: ProductCardProduct[];
};

const ProductGrid = React.memo(({ products }: ProductGridProps) => {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((product, index) => (
        <div key={product.id} className="w-full h-full">
          <ProductCard product={product} priority={index === 0} />
        </div>
      ))}
    </div>
  );
});

ProductGrid.displayName = "ProductGrid";

export default ProductGrid;
