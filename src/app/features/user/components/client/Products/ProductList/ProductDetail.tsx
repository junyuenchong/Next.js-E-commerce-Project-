"use client";

import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import ProductPrice from "@/app/components/shared/ProductPrice";
import AddToCartButton from "@/app/features/user/components/client/Products/AddToCartButton/AddToCartButton";
import SalesCampaignBanner from "@/app/features/user/components/client/SalesCampaignBanner/SalesCampaignBanner";
import { IMG } from "@/app/lib/image-sizes";
import type { ProductDetailPayload } from "@/app/features/user/types";
import {
  useProductDetail,
  type ProductReview,
} from "@/app/features/user/hooks";

const ProductDetail = memo(function ProductDetail({
  productId,
  initialProduct,
}: {
  productId: string | number;
  initialProduct: ProductDetailPayload;
}) {
  const {
    product,
    user,
    sessionLoading,
    canReview,
    rating,
    setRating,
    comment,
    setComment,
    reviewMessage,
    reviews,
    reviewsLoading,
    averageRating,
    reviewMutation,
    submitReview,
    eligibilityLoading,
  } = useProductDetail(productId, initialProduct);

  if (!product) return <div>Product not found</div>;

  const signInHref = `/features/user/auth/sign-in?returnUrl=${encodeURIComponent(
    `/features/user/product/${productId}`,
  )}`;
  const canSubmitReview =
    Boolean(user) && !sessionLoading && Boolean(canReview);
  const showRatingsModule = Boolean(canReview) && !eligibilityLoading;

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
      {/* Availability (real stock + recent paid sales) */}
      <div className="bg-gradient-to-r from-slate-100 to-slate-200/80 py-6 px-4 border-y border-slate-200">
        <div className="container mx-auto text-center space-y-2">
          <p className="text-lg md:text-xl font-semibold text-slate-800">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>
          {(product.soldLast24h ?? 0) > 0 ? (
            <p className="text-sm text-slate-600">
              {product.soldLast24h ?? 0} units sold in paid orders in the last
              24 hours
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              No paid sales recorded in the last 24 hours
            </p>
          )}
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
                  sizes={IMG.detail}
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
            {/* Sale price + optional list price (compare-at) */}
            <div className="flex flex-col gap-2 mt-4">
              <ProductPrice
                salePrice={product.price}
                compareAtPrice={product.compareAtPrice}
                containerClassName="flex flex-wrap items-baseline gap-3"
                salePriceClassName="text-5xl font-black text-red-600 tracking-tight"
                compareAtPriceClassName="text-xl text-gray-400 line-through"
                discountBadgeClassName="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-sm font-semibold text-rose-700"
                salePricePrefix="MY "
                discountSuffix="% OFF"
                stripSalePriceCurrency
              />
              <p className="text-sm text-gray-600">
                {(product.reviewCount ?? 0) > 0 ? (
                  <>
                    {product.avgRating != null &&
                    Number.isFinite(product.avgRating)
                      ? `${product.avgRating.toFixed(1)} avg rating`
                      : "Rated"}{" "}
                    · {product.reviewCount ?? 0} review
                    {(product.reviewCount ?? 0) === 1 ? "" : "s"}
                  </>
                ) : (
                  "No reviews yet — be the first to rate this product below."
                )}
              </p>
            </div>
            <AddToCartButton product={product} />
            <div className="flex flex-col gap-3 mt-6 text-sm bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 text-gray-700">
                <span className="bg-green-100 p-2 rounded-full">✅</span>
                <span className="font-medium">
                  {product.stock > 0
                    ? `${product.stock} in stock — ships within 24 hours`
                    : "Out of stock"}
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

            {showRatingsModule ? (
              <div className="mt-8 bg-white border border-gray-100 rounded-xl p-4 space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Product Ratings & Comments
                </h2>
                <p className="text-sm text-gray-600">
                  Average rating:{" "}
                  <span className="font-semibold">
                    {averageRating.toFixed(1)}
                  </span>{" "}
                  / 5 ({reviews.length} reviews)
                </p>

                {!canSubmitReview ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {sessionLoading ? (
                      "Checking your sign-in status..."
                    ) : (
                      <>
                        Please{" "}
                        <Link
                          href={signInHref}
                          className="font-semibold underline"
                        >
                          sign in
                        </Link>{" "}
                        and purchase this product before submitting a rating and
                        comment.
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Only customers who purchased this product can leave a rating
                    and comment.
                  </p>
                )}

                <form onSubmit={submitReview} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      Your rating:
                    </label>
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="border rounded px-2 py-1 text-sm"
                      disabled={!canSubmitReview || reviewMutation.isPending}
                    >
                      <option value={5}>5 - Excellent</option>
                      <option value={4}>4 - Good</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Poor</option>
                      <option value={1}>1 - Bad</option>
                    </select>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={
                      canSubmitReview
                        ? "Write your comment..."
                        : "Sign in to write a comment..."
                    }
                    className="w-full border rounded px-3 py-2 text-sm min-h-24"
                    disabled={!canSubmitReview || reviewMutation.isPending}
                  />
                  <button
                    type="submit"
                    disabled={!canSubmitReview || reviewMutation.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-60"
                  >
                    {reviewMutation.isPending
                      ? "Submitting..."
                      : "Submit Review"}
                  </button>
                  {reviewMessage && (
                    <p className="text-sm text-gray-700">{reviewMessage}</p>
                  )}
                </form>

                <div className="space-y-3">
                  {reviewsLoading ? (
                    <p className="text-sm text-gray-500">Loading reviews...</p>
                  ) : reviews.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No ratings yet. Be the first verified buyer to comment.
                    </p>
                  ) : (
                    reviews.map((review: ProductReview) => (
                      <div
                        key={review.id}
                        className="border border-gray-100 rounded-lg p-3"
                      >
                        <div className="text-sm font-medium text-gray-800">
                          {review.user.name || review.user.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          Rating: {review.rating}/5
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          {review.comment}
                        </p>
                        {review.adminReply && (
                          <div className="mt-2 bg-blue-50 border border-blue-100 rounded p-2">
                            <p className="text-xs font-semibold text-blue-700">
                              Admin reply
                            </p>
                            <p className="text-sm text-blue-800">
                              {review.adminReply}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductDetail;
