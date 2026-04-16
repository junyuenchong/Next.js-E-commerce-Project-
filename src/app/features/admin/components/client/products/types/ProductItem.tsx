"use client";

import React, { memo, Suspense } from "react";
import { Product, Category } from "@prisma/client";
import dynamic from "next/dynamic";
import ProductPrice from "@/app/components/shared/ProductPrice";
import { useAdminProductReviews } from "@/app/features/admin/hooks";
import { resolveSalePricing } from "@/app/lib/format-price";

// Dynamic import for next/image to avoid SSR issues
const Image = dynamic(() => import("next/image"), { ssr: false });

const IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

// Types
interface ProductWithCategory extends Product {
  category?: Category;
}

type AdminCategory = { id: number; name: string };

interface ProductItemProps {
  product: ProductWithCategory;
  editingId?: number | null;
  editForm?: {
    title: string;
    description: string;
    price: string;
    compareAtPrice: string;
    stock: string;
    imageUrl: string;
    categoryId: string;
  };
  previewUrl?: string | null;
  editErrors?: Record<string, string>;
  handleEditChange?: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => void;
  handleImageChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpdate?: (id: number) => void;
  setEditingId?: (id: number | null) => void;
  handleEditClick?: (product: ProductWithCategory) => void;
  handleDelete?: (id: number) => void;
  onProductCreated?: () => void;
  onProductUpdated?: () => void;
  onProductDeleted?: () => void;
  priority?: boolean;
  categories?: AdminCategory[];
  categoriesLoading?: boolean;
}

const ProductItem = memo(function ProductItem({
  product,
  editingId,
  editForm,
  previewUrl,
  editErrors = {},
  handleEditChange,
  handleImageChange,
  handleUpdate,
  setEditingId,
  handleEditClick,
  handleDelete,
  priority,
  categories = [],
  categoriesLoading = false,
}: ProductItemProps) {
  const isEditing = editingId === product.id;
  const {
    reviews,
    replyDrafts,
    setReplyDrafts,
    reviewsLoading,
    reviewsError,
    saveReply,
    removeReview,
  } = useAdminProductReviews(product.id);

  // Note: we intentionally show discount only when compare-at > sale price.
  const pricing = resolveSalePricing(product.compareAtPrice, product.price);

  return (
    <div className="border rounded-xl p-3 sm:p-4 shadow-sm bg-white flex flex-col h-auto min-h-[380px] w-full max-w-sm mx-auto">
      {isEditing ? (
        <div className="space-y-3 flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              name="title"
              value={editForm?.title}
              onChange={handleEditChange}
              className={`border px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                editErrors.title ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Product title"
            />
            {editErrors.title && (
              <p className="text-red-500 text-xs mt-1">{editErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={editForm?.description}
              onChange={handleEditChange}
              className={`border px-3 py-2 rounded-lg w-full text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                editErrors.description ? "border-red-500" : "border-gray-300"
              }`}
              rows={3}
              placeholder="Product description"
            />
            {editErrors.description && (
              <p className="text-red-500 text-xs mt-1">
                {editErrors.description}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Price
            </label>
            <input
              name="price"
              type="number"
              value={editForm?.price}
              onChange={handleEditChange}
              className={`border px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                editErrors.price ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {editErrors.price && (
              <p className="text-red-500 text-xs mt-1">{editErrors.price}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              List / compare-at price (optional)
            </label>
            <input
              name="compareAtPrice"
              type="number"
              value={editForm?.compareAtPrice}
              onChange={handleEditChange}
              className={`border px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                editErrors.compareAtPrice ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Higher than sale price for discount badge"
              step="0.01"
              min="0"
            />
            {editErrors.compareAtPrice && (
              <p className="text-red-500 text-xs mt-1">
                {editErrors.compareAtPrice}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Stock
            </label>
            <input
              name="stock"
              type="number"
              min={0}
              step={1}
              value={editForm?.stock}
              onChange={handleEditChange}
              className={`border px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                editErrors.stock ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="0"
            />
            {editErrors.stock && (
              <p className="text-red-500 text-xs mt-1">{editErrors.stock}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {previewUrl && (
            <div className="w-full aspect-[4/3] relative rounded-lg overflow-hidden border">
              <Suspense
                fallback={
                  <div className="bg-gray-100 w-full h-full animate-pulse" />
                }
              >
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  sizes={IMAGE_SIZES}
                  className="object-cover"
                />
              </Suspense>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Category
            </label>
            {categoriesLoading ? (
              <div className="border px-3 py-2 rounded-lg w-full text-sm bg-gray-50 text-gray-500">
                Loading categories...
              </div>
            ) : (
              <select
                name="categoryId"
                value={editForm?.categoryId}
                onChange={handleEditChange}
                className={`border px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  editErrors.categoryId ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select Category</option>
                {categories.map((cat: { id: number; name: string }) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
            {editErrors.categoryId && (
              <p className="text-red-500 text-xs mt-1">
                {editErrors.categoryId}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => handleUpdate?.(product.id)}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Save
            </button>
            <button
              onClick={() => setEditingId?.(null)}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="w-full aspect-[4/3] relative rounded-lg overflow-hidden mb-4 shadow-sm">
            <Suspense
              fallback={
                <div className="bg-gray-100 w-full h-full animate-pulse" />
              }
            >
              <Image
                src={product.imageUrl || "/placeholder.png"}
                alt={product.title}
                fill
                sizes={IMAGE_SIZES}
                className="object-cover"
                {...(priority ? { priority: true } : { loading: "lazy" })}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
              />
            </Suspense>
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 leading-tight">
              {product.title}
            </h3>

            <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
              {product.description}
            </p>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <ProductPrice
                salePrice={pricing.salePriceNumber}
                compareAtPrice={pricing.compareAtPriceNumber}
                containerClassName="text-lg font-bold text-green-600 flex flex-wrap items-baseline gap-2"
                salePriceClassName=""
                compareAtPriceClassName="text-sm text-gray-400 line-through font-normal"
                discountBadgeClassName="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700"
              />
              <div className="text-xs font-medium text-gray-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                Stock:{" "}
                {typeof product.stock === "number" && !isNaN(product.stock)
                  ? product.stock
                  : "0"}
              </div>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {product.category?.name || "N/A"}
              </div>
            </div>

            <div className="mt-3 border border-gray-100 rounded-lg p-2 space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                User ratings & comments
              </p>
              {reviewsError && (
                <p className="text-xs text-red-600" role="alert">
                  {reviewsError}
                </p>
              )}
              {reviewsLoading ? (
                <p className="text-xs text-gray-500">Loading comments...</p>
              ) : reviewsError ? null : reviews.length === 0 ? (
                <p className="text-xs text-gray-500">No comments yet.</p>
              ) : (
                reviews.slice(0, 3).map((review) => (
                  <div
                    key={review.id}
                    className="border border-gray-100 rounded p-2 space-y-1"
                  >
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">
                        {review.user.name || review.user.email}
                      </span>{" "}
                      • {review.rating}/5
                    </p>
                    <p className="text-xs text-gray-700">{review.comment}</p>
                    <textarea
                      value={replyDrafts[review.id] ?? ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [review.id]: e.target.value,
                        }))
                      }
                      placeholder="Write admin reply..."
                      className="w-full text-xs border rounded px-2 py-1 min-h-14"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => saveReply(review.id)}
                        className="bg-blue-600 text-white text-xs px-2 py-1 rounded"
                      >
                        Save Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => removeReview(review.id)}
                        className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded hover:bg-red-100"
                      >
                        Remove review
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => handleEditClick?.(product)}
              className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete?.(product.id)}
              className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

ProductItem.displayName = "ProductItem";

export default ProductItem;
export type { ProductWithCategory, ProductItemProps };
