"use client";

import React, { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import ProductGrid from "../sub/ProductGrid";
import { updateProduct, deleteProduct } from "@/actions/product";
import { useRealtimeSWR } from '@/lib/hooks/useRealtimeSWR';
import type { ProductWithCategory } from "../types/ProductItem";

const PAGE_SIZE = 10;

const ProductList = forwardRef(function ProductList(_, ref) {
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const url = `/admin/api/products?limit=${PAGE_SIZE}&page=${page}`;
  const { data, mutate } = useRealtimeSWR({
    url,
    event: 'products_updated',
    matchKey: (key) => typeof key === 'string' && key.includes('/products'),
    swrOptions: {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 0,
    },
  });

  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setProducts(Array.isArray(data) ? data : []);
    } else if (Array.isArray(data)) {
      setProducts(prev => [...prev, ...data]);
    }
    setHasMore(Array.isArray(data) && data.length === PAGE_SIZE);
    setIsLoading(false);
  }, [data, page]);

  const handleLoadMore = () => {
    setIsLoading(true);
    setPage(p => p + 1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    await mutate();
    setIsRefreshing(false);
  };

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

  useImperativeHandle(ref, () => ({
    handleRefresh,
  }));

  if (!products.length && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <button className="px-4 py-2 bg-gray-300 text-gray-600 rounded flex items-center gap-2" disabled>
          <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full inline-block"></span>
          Loading Products...
        </button>
      </div>
    );
  }
  if (!products.length) return <div>No products found.</div>;
  return (
    <div className="space-y-6">
      <ProductGrid
        products={products}
        itemProps={{
          editingId: editingId,
          editForm: editForm,
          previewUrl: previewUrl,
          editErrors: editErrors,
          setEditingId: setEditingId,
          handleEditClick: handleEditClick,
          handleEditChange: handleEditChange,
          handleImageChange: handleImageChange,
          handleUpdate: handleUpdate,
          handleDelete: handleDelete,
        }}
        onProductCreated={handleRefresh}
        onProductUpdated={handleRefresh}
        onProductDeleted={handleRefresh}
      />
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            className="mt-4 px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-600 rounded-full inline-block"></span>
            ) : null}
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
      {!hasMore && <div className="flex justify-center text-gray-400 mt-4">No more products</div>}
    </div>
  );
});

export default ProductList;
