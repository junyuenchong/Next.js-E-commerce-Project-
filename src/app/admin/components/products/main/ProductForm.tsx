"use client";

import { useState } from "react";
import Image from "next/image"; 
import { createProduct } from "@/actions/product";
import { productSchema } from "@/lib/validators/product";
import useSWR, { mutate } from "swr";
import axios from "axios";
import React from "react";

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

export default function ProductForm({ onProductCreated }: { onProductCreated?: () => void }) {
  const { data: categories = [], isLoading: categoriesLoading } = useSWR(
    "/admin/api/categories",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update categoryId when categories load
  React.useEffect(() => {
    if (categories.length > 0 && !formData.categoryId) {
      setFormData(prev => ({ ...prev, categoryId: String(categories[0].id) }));
    }
  }, [categories, formData.categoryId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const validateForm = () => {
    const payload = {
      title: formData.title,
      description: formData.description,
      price: parseFloat(formData.price) || 0,
      imageUrl: formData.imageUrl,
      categoryId: parseInt(formData.categoryId) || 0,
    };

    const validation = productSchema.safeParse(payload);
    
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        newErrors[field] = error.message;
      });
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    let imageUrl = formData.imageUrl;

    if (imageFile) {
      const form = new FormData();
      form.append("file", imageFile);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });

        const contentType = res.headers.get("content-type");
        if (!res.ok) {
          const message = contentType?.includes("application/json")
            ? (await res.json()).message
            : "Unknown upload error";
          throw new Error(message);
        }

        const data = await res.json();
        imageUrl = data.secure_url;
      } catch (error) {
        console.error("❌ Image upload failed:", error);
        alert("❌ Image upload failed: " + (error as Error).message);
        setLoading(false);
        return;
      }
    }

    const payload = {
      ...formData,
      imageUrl,
      price: parseFloat(formData.price),
      description: formData.description?.trim() || undefined,
    };

    try {
      await createProduct(payload);
      alert("✅ Product created!");

      // Revalidate SWR cache for product list
      mutate('/admin/api/products?limit=20&page=1');

      // Call the callback to refresh the product list
      onProductCreated?.();

      setFormData({
        title: "",
        description: "",
        price: "",
        imageUrl: "",
        categoryId: categories.length > 0 ? String(categories[0].id) : "",
      });
      setPreviewUrl(null);
      setImageFile(null);
      setErrors({});
    } catch (error) {
      console.error("❌ Product creation failed:", error);
      alert("❌ Failed to create product");
    } finally {
      setLoading(false);
    }
  };

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
        <label htmlFor="product-title" className="block text-sm font-medium text-gray-700 mb-1">
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
          className={`border px-3 py-2 w-full rounded ${errors.title ? 'border-red-500' : ''}`}
        />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
      </div>
      
      <div>
        <label htmlFor="product-description" className="block text-sm font-medium text-gray-700 mb-1">
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
          className={`border px-3 py-2 w-full rounded ${errors.description ? 'border-red-500' : ''}`}
        />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
      </div>
      
      <div>
        <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 mb-1">
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
          className={`border px-3 py-2 w-full rounded ${errors.price ? 'border-red-500' : ''}`}
        />
        {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
      </div>
      
      <div>
        <label htmlFor="product-image" className="block text-sm font-medium text-gray-700 mb-1">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Image Preview</label>
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
        <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="product-category"
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          className={`border px-3 py-2 w-full rounded ${errors.categoryId ? 'border-red-500' : ''}`}
        >
          {categories.map((cat: { id: number; name: string }) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>}
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
