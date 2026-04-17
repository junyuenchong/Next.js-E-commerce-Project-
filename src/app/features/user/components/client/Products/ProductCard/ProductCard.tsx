"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import ProductPrice from "@/app/components/shared/ProductPrice";
import { useUser } from "@/app/features/user/components/client/UserContext";
import { useProductCardWishlist } from "@/app/features/user/hooks";
import { resolveSalePricing } from "@/app/lib/format-price";
import { IMG } from "@/app/lib/image-sizes";
import type { ProductCardProduct } from "@/app/features/user/types";

const RATING_STARS = [0, 1, 2, 3, 4] as const;

type ProductCardProps = {
  product: ProductCardProduct;
};

function StarRow({
  avgRating,
  reviewCount,
}: {
  avgRating: number | null | undefined;
  reviewCount: number;
}) {
  const filled =
    reviewCount > 0 && avgRating != null && Number.isFinite(avgRating)
      ? Math.min(5, Math.max(0, Math.round(avgRating)))
      : 0;

  return (
    <div className="flex items-center gap-0.5 text-yellow-500 text-xs">
      {RATING_STARS.map((i) => (
        <span key={i} className={i < filled ? "" : "text-gray-300"} aria-hidden>
          ★
        </span>
      ))}
      <span className="text-gray-500 ml-1">
        {reviewCount > 0 ? `(${reviewCount})` : "(No reviews yet)"}
      </span>
    </div>
  );
}

const ProductCard = React.memo(
  ({
    product,
    priority = false,
  }: ProductCardProps & { priority?: boolean }) => {
    const { user } = useUser();
    const { wishPending, saveToWishlist } = useProductCardWishlist(product.id);

    const reviewCount = product.reviewCount ?? 0;
    const avgRating = product.avgRating ?? null;
    const soldLast24h = product.soldLast24h ?? 0;
    const { discountPercent } = resolveSalePricing(
      product.compareAtPrice,
      product.price,
    );

    return (
      <div
        className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col group overflow-hidden h-full"
        aria-label={product.title}
      >
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
          {discountPercent != null ? (
            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              −{discountPercent}%
            </span>
          ) : null}
          {product.stock > 0 && product.stock <= 5 ? (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              Only {product.stock} left
            </span>
          ) : null}
        </div>

        {/* Product Image */}
        <div className="relative w-full aspect-[1/1] overflow-hidden bg-gray-50">
          <Image
            src={product.imageUrl || "/placeholder.png"}
            alt={product.title}
            fill
            sizes={IMG.grid}
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

          <StarRow avgRating={avgRating} reviewCount={reviewCount} />

          <p className="text-xs text-gray-500 line-clamp-2">
            {product.description ?? ""}
          </p>

          <ProductPrice
            salePrice={product.price}
            compareAtPrice={product.compareAtPrice}
            containerClassName="flex flex-wrap items-end gap-2 mt-auto"
            salePriceClassName="text-lg font-bold text-red-600"
            compareAtPriceClassName="text-sm text-gray-400 line-through"
          />

          {soldLast24h > 0 ? (
            <div className="text-xs text-green-700 font-medium">
              {soldLast24h} sold in last 24h (completed orders)
            </div>
          ) : null}

          {user ? (
            <button
              type="button"
              disabled={wishPending}
              className="w-full text-center py-1.5 rounded-full text-xs font-semibold border border-pink-300 text-pink-700 hover:bg-pink-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void saveToWishlist();
              }}
            >
              {wishPending ? "Saving…" : "♥ Save to wishlist"}
            </button>
          ) : null}

          <Link
            href={`/features/user/product/${product.id}`}
            className="w-full text-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 py-2 rounded-full text-sm font-bold hover:brightness-110 transition-all"
            aria-label={`View ${product.title}`}
          >
            View product
          </Link>
        </div>
      </div>
    );
  },
);

ProductCard.displayName = "ProductCard";

export default ProductCard;
