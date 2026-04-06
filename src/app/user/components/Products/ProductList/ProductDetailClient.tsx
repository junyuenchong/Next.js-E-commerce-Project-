"use client";
import React, { memo, useMemo } from "react";
import AddToCartButton from "../AddToCartButton/AddToCartButton";
import Image from "next/image";
import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import SalesCampaignBanner from "../../SalesCampaignBanner/SalesCampaignBanner";
import { Product } from "@prisma/client";
import { useRealtimeQuery } from "@/lib/hooks/useRealtimeQuery";
import { qk } from "@/lib/query-keys";

// Helper function to format price in RM
const formatPriceRM = (price: number): string => {
  return `RM ${price.toFixed(2)}`;
};

/** Deterministic “pseudo-random” values from id so SSR and client HTML match. */
function pseudoFromId(id: string | number, mod: number): number {
  const n = Number(id);
  if (!Number.isFinite(n)) return 1;
  return Math.abs(n % mod) + 1;
}

function buyersThisHour(id: string | number): number {
  const n = Number(id);
  if (!Number.isFinite(n)) return 42;
  return 20 + Math.abs((n * 17) % 50);
}

const ProductDetailClient = memo(function ProductDetailClient({
  productId,
  initialProduct,
}: {
  productId: string | number;
  initialProduct: Product;
}) {
  const { data: product } = useRealtimeQuery<Product>(
    qk.user.productDetail(String(productId)),
    async () => {
      const res = await fetch(`/user/api/products/${productId}`);
      return res.json();
    },
    {
      channels: "products",
      initialData: initialProduct,
      // Render can be unreliable for long-lived SSE; keep detail fresh via polling too.
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  );

  const originalPrice = useMemo(
    () => (product?.price ?? 0) * 5,
    [product?.price],
  );
  if (!product) return <div>Product not found</div>;

  return (
    <div className="bg-gray-50">
      <SalesCampaignBanner />
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto py-3 px-4">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-gray-600 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 truncate">{product.title}</span>
          </div>
        </div>
      </div>
      {/* Product Sale Banner */}
      <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 py-6 px-4">
        <div className="container mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold text-center text-red-600 mb-3">
            🔥 FLASH SALE - 80% OFF 🔥
          </h1>
          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-red-500 text-sm md:text-base font-semibold animate-pulse">
              ⚡️ Only {pseudoFromId(product.id, 10)} items left at this price!
            </p>
            <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm">
              ⏰ Offer ends soon!
            </div>
          </div>
        </div>
      </div>
      {/* Guarantee Items */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 py-4">
        <div className="container mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 text-xl">🚚</span>
              <span className="font-medium">Free Express Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 text-xl">✨</span>
              <span className="font-medium">Satisfaction Guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 text-xl">🔒</span>
              <span className="font-medium">Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>
      {/* Product Details */}
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product image */}
          {product.imageUrl && (
            <div className="bg-white rounded-2xl p-4 aspect-square overflow-hidden shadow-lg">
              <div className="relative aspect-square">
                <Image
                  fill
                  priority
                  className="object-cover hover:scale-105 transition-transform duration-300"
                  alt={product.title ?? "Product Image"}
                  src={product.imageUrl}
                />
              </div>
            </div>
          )}
          {/* Product information */}
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              {product.title}
            </h1>
            <p className="text-gray-600">{product.description}</p>
            {/* Price section */}
            <div className="flex flex-col gap-2 mt-4">
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-red-600">MY</span>
                  <span className="text-5xl font-black text-red-600 tracking-tight">
                    {formatPriceRM(product.price).replace("RM ", "")}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg text-gray-400 line-through decoration-red-500/50 decoration-2">
                    {formatPriceRM(originalPrice)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-sm font-bold animate-pulse">
                      -80%
                    </span>
                    <span className="text-red-600 font-bold text-sm">
                      MEGA SAVINGS
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg">
                <span className="text-red-600 font-bold">💰</span>
                <span className="text-red-600 font-medium text-sm">
                  You save {formatPriceRM(originalPrice - product.price)}!
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span>
                  {buyersThisHour(product.id)} people bought in the last hour
                </span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 p-4 rounded-xl mt-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <span className="text-xl">⚡️</span>
                <span className="font-bold">Limited Time Offer!</span>
              </div>
              <div className="text-sm text-yellow-700 mt-1 font-medium">
                Order now before price changes!
              </div>
            </div>
            <AddToCartButton product={product} />
            <div className="flex flex-col gap-3 mt-6 text-sm bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 text-gray-700">
                <span className="bg-green-100 p-2 rounded-full">✅</span>
                <span className="font-medium">
                  In stock - Ships within 24 hours
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="bg-green-100 p-2 rounded-full">🔄</span>
                <span className="font-medium">30-day money-back guarantee</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="bg-green-100 p-2 rounded-full">🛡️</span>
                <span className="font-medium">Secure payment processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductDetailClient;
