"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import axios from "axios";
import ProductSearch from "../sub/ProductSearch";
import ProductGrid from "../sub/ProductGrid";
import LoadMoreButton from "../sub/LoadMoreButton";
import { Product, Category } from "@prisma/client";
import { updateProduct, deleteProduct } from "@/actions/product";
import { useRealtimeSWR } from '@/lib/hooks/useRealtimeSWR';

interface ProductWithCategory extends Product {
  category?: Category;
}

const PAGE_SIZE = 20;

const ProductListSkeleton = () => (
  <div className="space-y-6">
    <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="border rounded-xl p-4 shadow-sm bg-white">
          <div className="w-full aspect-[4/3] bg-gray-200 rounded-lg mb-4 animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            <div className="flex justify-between items-center pt-2">
              <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="flex justify-center">
      <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
    </div>
  </div>
);

const ProductList = forwardRef(function ProductList(_, ref) {
  const { data: products, mutate } = useRealtimeSWR({
    url: '/admin/api/products',
    event: 'products_updated',
    matchKey: (key) => typeof key === 'string' && key.includes('/products'),
    swrOptions: {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
    },
  });
  // --- Editing state ---
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // --- Editing handlers ---
  const handleEditClick = (product: ProductWithCategory) => {
    setEditingId(product.id);
    setEditForm({
      title: product.title || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      imageUrl: product.imageUrl || "",
      categoryId: String(product.categoryId ?? ""),
    });
    setPreviewUrl(product.imageUrl || null);
    setEditErrors({});
  };

  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name]) {
      setEditErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setEditForm((prev) => ({ ...prev, imageUrl: "" }));
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const payload = {
        ...editForm,
        price: parseFloat(editForm.price),
        categoryId: parseInt(editForm.categoryId),
      };
      const result = await updateProduct(id, payload);
      if (result) {
        setEditingId(null);
        setTimeout(() => handleRefresh(), 200);
      } else {
        alert("Update failed: No result returned");
      }
    } catch {
      alert("Failed to update product");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      handleRefresh();
    } catch {
      alert("Failed to delete product");
    }
  };

  // Remove all axios and manual fetch logic, use products from SWR
  // Replace handleRefresh with mutate
  const handleRefresh = () => mutate();

  useImperativeHandle(ref, () => ({
    handleRefresh,
  }));

  if (!Array.isArray(products)) {
    return <ProductListSkeleton />;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={handleRefresh}
        disabled={false}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Refresh
      </button>
      <ProductGrid
        products={products}
        itemProps={{
          editingId,
          editForm,
          previewUrl,
          editErrors,
          setEditingId,
          handleEditClick,
          handleEditChange,
          handleImageChange,
          handleUpdate,
          handleDelete,
        }}
        onProductCreated={handleRefresh}
        onProductUpdated={handleRefresh}
        onProductDeleted={handleRefresh}
      />
    </div>
  );
});

export default ProductList;
