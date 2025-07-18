"use client";

import React from "react";
import { Product } from "@prisma/client";
import ProductCard from "../ProductCard/ProductCard";

// Hook to get current window width
function useWindowSize() {
  const [size, setSize] = React.useState({ width: 1200 });
  React.useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

// Responsive Tailwind grid class
function getGridClass(width: number) {
  if (width < 400) return "grid-cols-1";
  if (width < 640) return "grid-cols-2";
  if (width < 900) return "grid-cols-2 sm:grid-cols-3";
  if (width < 1280) return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";
  return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
}

type ProductGridProps = {
  products: Product[];
};

const ProductGrid = React.memo(({ products }: ProductGridProps) => {
  const { width } = useWindowSize();
  const gridClass = `grid gap-4 ${getGridClass(width)}`;

  return (
    <div className={gridClass}>
      {products.map((product, index) => (
        <div key={product.id} className="w-full h-full">
          <ProductCard product={{
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            imageUrl: product.imageUrl,
            slug: product.slug,
            categoryId: product.categoryId,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            stock: product.stock ?? 0,
            isActive: product.isActive ?? true,
          }} priority={index === 0} />
        </div>
      ))}
    </div>
  );
});

ProductGrid.displayName = "ProductGrid";

export default ProductGrid;
