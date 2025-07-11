// components/ProductCard.tsx
import React from "react";
import { Product } from "@prisma/client";
import Image from "next/image";

// Helper
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

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition flex flex-col">
      <div className="absolute top-2 right-2 z-10">
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
          HOT!
        </span>
      </div>

      <div className="w-full aspect-[1/1] overflow-hidden rounded-t-lg relative">
        <Image
          src={product.imageUrl || "/placeholder.png"}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover rounded-t-lg"
          unoptimized={product.imageUrl?.startsWith("blob:") ?? false}
        />
      </div>

      <div className="p-3 flex flex-col justify-between flex-grow">
        <h3 className="text-sm font-medium text-gray-800 leading-tight truncate">
          {product.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
          {product.description}
        </p>
        <div className="mt-2 text-red-600 font-bold text-base">
          <span className="text-lg font-bold text-red-500">RM {product.price.toFixed(2)}</span>
          <span className="text-sm text-gray-400 line-through ml-1">
            RM{((product.price || 0) * 5).toFixed(2)}
          </span>
        </div>

        <div className="text-xs text-green-500 font-semibold mb-2">
          🔥 {getSoldCount(product.id)}+ sold in last 24h
        </div>

        <button className="w-full text-center bg-gradient-to-r from-red-500 to-orange-500 text-white py-2 rounded-full text-sm font-bold hover:brightness-110 transition-all">
          GRAB IT NOW!
        </button>
        <div className="text-xs text-red-500 text-center mt-1 animate-pulse">
          ⚡ Limited time offer!
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
