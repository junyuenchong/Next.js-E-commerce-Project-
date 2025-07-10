// app/user/products/page.tsx or a component file
"use client";

import useSWR from "swr";
import axios from "axios";
import { Product } from "@prisma/client";

// Fetcher function for SWR
const fetcher = (url: string) => axios.get(url).then((res) => res.data);

const ProductList = () => {
  const { data: products, isLoading } = useSWR<Product[]>("/user/api/products", fetcher, {
    refreshInterval: 5000, // Poll every 5 seconds
  });

  if (isLoading || !products) return <div>Loading...</div>;

  return (
    <div className="bg-white rounded-lg overflow-hidden p-4">
      <div className="max-w-[1600px] mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition flex flex-col"
          >
            {/* 🔥 HOT badge */}
            <div className="absolute top-2 right-2 z-10">
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                HOT!
              </span>
            </div>

            {/* Product Image */}
            <div className="w-full aspect-[1/1] overflow-hidden rounded-t-lg">
              <img
                src={product.imageUrl ?? "/placeholder.png"}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Product Info */}
            <div className="p-3 flex flex-col justify-between flex-grow">
              <h3 className="text-sm font-medium text-gray-800 leading-tight truncate">
                {product.title}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                {product.description}
              </p>
              <div className="mt-2 text-red-600 font-bold text-base">
                RM {product.price.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;
