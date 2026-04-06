"use client";

import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import ProductGrid from "../sub/ProductGrid";
import { updateProduct, deleteProduct } from "@/actions/product";
import { useRealtimeQuery } from "@/lib/hooks/useRealtimeQuery";
import type { ProductWithCategory } from "../types/ProductItem";
import { useQuery } from "@tanstack/react-query";

type AdminCategory = { id: number; name: string };

const PAGE_SIZE = 10;

const ProductList = forwardRef(function ProductList(_, ref) {
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [, setIsRefreshing] = useState(false);
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

  const url = useMemo(
    () => `/admin/api/products?limit=${PAGE_SIZE}&page=${page}`,
    [page],
  );
  const { data, refetch } = useRealtimeQuery(
    ["admin-products", page],
    async () => {
      const res = await fetch(url);
      return res.json();
    },
    {
      channels: "products",
    },
  );

  const categoriesQuery = useQuery<AdminCategory[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await fetch("/admin/api/categories");
      return res.json();
    },
    staleTime: 300000,
    retry: 1,
  });

  // Merge each fetched page into local list state.
  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setProducts(Array.isArray(data) ? data : []);
    } else if (Array.isArray(data)) {
      setProducts((prev) => [...prev, ...data]);
    }
    setHasMore(Array.isArray(data) && data.length === PAGE_SIZE);
    setIsLoading(false);
  }, [data, page]);

  const handleLoadMore = useCallback(() => {
    setIsLoading(true);
    setPage((p) => p + 1);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  // --- Editing handlers ---
  const handleEditClick = useCallback((product: ProductWithCategory) => {
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
  }, []);

  const handleEditChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { name, value } = e.target;
      setEditForm((prev) => ({ ...prev, [name]: value }));
      if (editErrors[name]) {
        setEditErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [editErrors],
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setPreviewUrl(URL.createObjectURL(file));
        setEditForm((prev) => ({ ...prev, imageUrl: "" }));
      }
    },
    [],
  );

  const handleUpdate = useCallback(
    async (id: number) => {
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
    },
    [editForm, handleRefresh],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!window.confirm("Are you sure you want to delete this product?"))
        return;
      try {
        await deleteProduct(id);
        handleRefresh();
      } catch {
        alert("Failed to delete product");
      }
    },
    [handleRefresh],
  );

  useImperativeHandle(ref, () => ({
    handleRefresh,
  }));

  const itemProps = useMemo(() => {
    return {
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
      categories: categoriesQuery.data ?? [],
      categoriesLoading: categoriesQuery.isLoading,
    };
  }, [
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
    categoriesQuery.data,
    categoriesQuery.isLoading,
  ]);

  if (!products.length && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <button
          className="px-4 py-2 bg-gray-300 text-gray-600 rounded flex items-center gap-2"
          disabled
        >
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
        itemProps={itemProps}
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
            {isLoading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
      {!hasMore && (
        <div className="flex justify-center text-gray-400 mt-4">
          No more products
        </div>
      )}
    </div>
  );
});

export default ProductList;
