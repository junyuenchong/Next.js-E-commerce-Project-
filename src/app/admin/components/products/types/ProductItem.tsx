"use client";

import React, { memo, Suspense } from "react";
import { Product, Category } from "@prisma/client";
import dynamic from "next/dynamic";
import useSWR from "swr";
import axios from "axios";

// Dynamic import for next/image to avoid SSR issues
const Image = dynamic(() => import("next/image"), { ssr: false });

// Types
interface ProductWithCategory extends Product {
  category?: Category;
}

interface ProductItemProps {
  product: ProductWithCategory;
  editingId?: number | null;
  editForm?: {
    title: string;
    description: string;
    price: string;
    imageUrl: string;
    categoryId: string;
  };
  previewUrl?: string | null;
  editErrors?: Record<string, string>;
  handleEditChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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
}

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

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
}: ProductItemProps) {
  const isEditing = editingId === product.id;

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useSWR(
    "/admin/api/categories",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // Cache for 5 minutes (increased from 1 minute)
      errorRetryCount: 1, // Limit retries for categories
    }
  );

  // Use a reasonable default for sizes for a card/grid layout
  // 100vw for mobile, 50vw for tablet, 33vw for desktop
  const imageSizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

  return (
    <div className="border rounded-xl p-3 sm:p-4 shadow-sm bg-white flex flex-col h-auto min-h-[380px] w-full max-w-sm mx-auto">
      {isEditing ? (
        <div className="space-y-3 flex-1">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <input
              name="title"
              value={editForm?.title}
              onChange={handleEditChange}
              className={`border px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                editErrors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Product title"
            />
            {editErrors.title && <p className="text-red-500 text-xs mt-1">{editErrors.title}</p>}
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={editForm?.description}
              onChange={handleEditChange}
              className={`border px-3 py-2 rounded-lg w-full text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                editErrors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={3}
              placeholder="Product description"
            />
            {editErrors.description && <p className="text-red-500 text-xs mt-1">{editErrors.description}</p>}
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
            <input
              name="price"
              type="number"
              value={editForm?.price}
              onChange={handleEditChange}
              className={`border px-3 py-2 rounded-lg w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                editErrors.price ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {editErrors.price && <p className="text-red-500 text-xs mt-1">{editErrors.price}</p>}
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          {previewUrl && (
            <div className="w-full aspect-[4/3] relative rounded-lg overflow-hidden border">
              <Suspense fallback={<div className="bg-gray-100 w-full h-full animate-pulse" />}>
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  sizes={imageSizes}
                  className="object-cover"
                />
              </Suspense>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
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
                editErrors.categoryId ? 'border-red-500' : 'border-gray-300'
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
            {editErrors.categoryId && <p className="text-red-500 text-xs mt-1">{editErrors.categoryId}</p>}
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
            <Suspense fallback={<div className="bg-gray-100 w-full h-full animate-pulse" />}>
              <Image
                src={product.imageUrl || "/placeholder.png"}
                alt={product.title}
                fill
                sizes={imageSizes}
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
            
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-green-600">
                ${typeof product.price === "number" && !isNaN(product.price) ? product.price.toFixed(2) : "0.00"}
              </div>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {product.category?.name || "N/A"}
              </div>
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
              onClick={() => handleDelete?.(product.id)}
              className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete
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