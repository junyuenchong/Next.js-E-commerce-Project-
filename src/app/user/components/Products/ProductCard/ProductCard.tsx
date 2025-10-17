"use client";

import React from "react";
import { Product } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

// Fake sold counter for demo
function getSoldCount(productId: string | number): number {
  const idStr = String(productId);
  let sum = 0;
  for (let i = 0; i < idStr.length; i++) {
    sum += idStr.charCodeAt(i);
  }
  return 100 + Math.abs(sum % 500);
}

type ProductCardProps = {
  product: Product;
};

const ProductCard = React.memo(({ product, priority = false }: ProductCardProps & { priority?: boolean }) => {
  return (
    <div
      className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden h-full"
      aria-label={product.title}
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
        <span className="bg-yellow-400 text-xs font-bold px-2 py-0.5 rounded-full text-yellow-900 shadow">
          Prime
        </span>
        <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          Best Seller
        </span>
      </div>
      <div className="absolute top-2 right-2 z-10">
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
          HOT!
        </span>
      </div>

      {/* Product Image */}
      <div className="relative w-full aspect-[1/1] overflow-hidden bg-gray-50">
        <Image
          src={product.imageUrl || "/placeholder.png"}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          quality={75}
          unoptimized={product.imageUrl?.startsWith("blob:") ?? false}
          {...(priority ? { priority: true } : { loading: "lazy" })}
        />
      </div>

      {/* Info Content */}
      <div className="p-3 sm:p-4 flex flex-col justify-between flex-grow gap-1 sm:gap-2">
        <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
          {product.title}
        </h3>

        <div className="flex items-center gap-1 text-yellow-500 text-xs">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < 4 ? "" : "text-gray-300"}>★</span>
          ))}
          <span className="text-gray-400 ml-1">(100+)</span>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2">
          {product.description}
        </p>

        <div className="flex items-end gap-2 mt-auto">
          <span className="text-lg font-bold text-red-600">
            RM {product.price.toFixed(2)}
          </span>
          <span className="text-xs text-gray-400 line-through">
            RM {(product.price * 1.5).toFixed(2)}
          </span>
        </div>

        <div className="text-xs text-green-600 font-semibold">
          🔥 {getSoldCount(product.id)}+ sold in last 24h
        </div>

        <Link href={`/user/product/${product.id}`}
          className="w-full text-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 py-2 rounded-full text-sm font-bold hover:brightness-110 transition-all"
          aria-label={`Add ${product.title} to cart`}
        >
          Add to Cart
        </Link>

        <div className="text-[10px] text-blue-600 text-center mt-1 animate-pulse font-semibold">
          Free Next-Day Delivery for Prime Members
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
