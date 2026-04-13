"use client";

import Image from "next/image";
import React from "react";
import { useAdminProductCreateForm } from "@/app/modules/admin/hooks";

export default function ProductForm({
  onProductCreated,
}: {
  onProductCreated?: () => void;
}) {
  const {
    formData,
    previewUrl,
    loading,
    errors,
    categories,
    categoriesLoading,
    handleChange,
    handleImageChange,
    handleSubmit,
  } = useAdminProductCreateForm(onProductCreated);

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading categories...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div>
        <label
          htmlFor="product-title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Product Title
        </label>
        <input
          id="product-title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter product title"
          autoComplete="off"
          required
          className={`border px-3 py-2 w-full rounded ${errors.title ? "border-red-500" : ""}`}
        />
        {errors.title && (
          <p className="text-red-500 text-sm mt-1">{errors.title}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="product-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <input
          id="product-description"
          name="description"
          type="text"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter product description"
          autoComplete="off"
          className={`border px-3 py-2 w-full rounded ${errors.description ? "border-red-500" : ""}`}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="product-price"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Price
        </label>
        <input
          id="product-price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={handleChange}
          placeholder="0.00"
          autoComplete="off"
          required
          className={`border px-3 py-2 w-full rounded ${errors.price ? "border-red-500" : ""}`}
        />
        {errors.price && (
          <p className="text-red-500 text-sm mt-1">{errors.price}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="product-compare-at"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          List / compare-at price (optional)
        </label>
        <p className="text-xs text-gray-500 mb-1">
          If higher than <strong>Price</strong>, the storefront shows a discount
          (sale price = Price).
        </p>
        <input
          id="product-compare-at"
          name="compareAtPrice"
          type="number"
          step="0.01"
          min="0"
          value={formData.compareAtPrice}
          onChange={handleChange}
          placeholder="Leave empty for no discount"
          autoComplete="off"
          className={`border px-3 py-2 w-full rounded ${errors.compareAtPrice ? "border-red-500" : ""}`}
        />
        {errors.compareAtPrice && (
          <p className="text-red-500 text-sm mt-1">{errors.compareAtPrice}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="product-stock"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Stock (units)
        </label>
        <input
          id="product-stock"
          name="stock"
          type="number"
          min="0"
          step="1"
          value={formData.stock}
          onChange={handleChange}
          placeholder="0"
          autoComplete="off"
          required
          className={`border px-3 py-2 w-full rounded ${errors.stock ? "border-red-500" : ""}`}
        />
        {errors.stock && (
          <p className="text-red-500 text-sm mt-1">{errors.stock}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="product-image"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Product Image
        </label>
        <input
          id="product-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="border px-3 py-2 w-full rounded"
        />
      </div>

      {previewUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image Preview
          </label>
          <Image
            src={previewUrl}
            alt="Product preview"
            width={128}
            height={128}
            className="rounded border object-cover w-32 h-32"
          />
        </div>
      )}

      <div>
        <label
          htmlFor="product-category"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Category
        </label>
        <select
          id="product-category"
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          className={`border px-3 py-2 w-full rounded ${errors.categoryId ? "border-red-500" : ""}`}
        >
          {categories.map((cat: { id: number; name: string }) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
