"use client";

import React from "react";
import { Product } from "@prisma/client";
import ProductCard from "../ProductCard/ProductCard";

// Hook to get current window width
function useWindowSize() {
  const [width, setWidth] = React.useState(1200);
  React.useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return width;
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
  const width = useWindowSize();
  const gridClass = React.useMemo(
    () => `grid gap-4 ${getGridClass(width)}`,
    [width],
  );

  return (
    <div className={gridClass}>
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
