"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteProduct, updateProduct } from "@/actions/product";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { productSchema } from "@/lib/validators";
import { Product, Category } from "@prisma/client";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeInvalidate } from "@/lib/hooks/useRealtimeQuery";
import { qk } from "@/lib/query-keys";

// Admin product hook: handles product list fetch, search, edit, and realtime refresh.
// Types
interface ProductWithCategory extends Product {
  category?: Category;
}

interface EditForm {
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  categoryId: string;
}

// Constants
const PAGE_SIZE = 20;
const fetcher = (url: string) => axios.get(url).then((res) => res.data);

export function useProductList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [allProducts, setAllProducts] = useState<ProductWithCategory[]>([]);
  const [isEnd, setIsEnd] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Map<number, Partial<ProductWithCategory>>
  >(new Map());

  const urlSearch = searchParams?.get("q") ?? "";
  const effectiveSearch = urlSearch || search || "";

  // Reset paging and merged state when search input/source changes.
  useEffect(() => {
    setAllProducts([]);
    setIsEnd(false);
    setPage(1);
    setSearch(effectiveSearch);
    setOptimisticUpdates(new Map());
  }, [effectiveSearch, urlSearch, search]);

  const fetchUrl = useMemo(
    () =>
      `/admin/api/products?limit=${PAGE_SIZE}&page=${page}&q=${encodeURIComponent(
        effectiveSearch,
      )}`,
    [effectiveSearch, page],
  );

  const query = useQuery<ProductWithCategory[]>({
    queryKey: qk.admin.productsList(fetchUrl),
    queryFn: () => fetcher(fetchUrl),
    staleTime: 1000,
  });

  const productsPage = query.data;
  const isLoading = query.isLoading;
  const error = query.error;

  useRealtimeInvalidate(qk.admin.productsList("all"), {
    eventsUrl: "/admin/api/events/products",
    matchKey: (key) =>
      Array.isArray(key) &&
      key[0] === "products" &&
      key[1] === "list" &&
      (key[2] as { scope?: string } | undefined)?.scope === "admin",
  });

  // Shared invalidation for any admin product list query variant.
  const invalidateAdminProducts = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (keyedQuery) =>
        Array.isArray(keyedQuery.queryKey) &&
        keyedQuery.queryKey[0] === "products" &&
        keyedQuery.queryKey[1] === "list" &&
        (keyedQuery.queryKey[2] as { scope?: string } | undefined)?.scope ===
          "admin",
    });
  }, [queryClient]);

  // Apply optimistic product patches before rendering the current page result.
  const applyOptimisticUpdates = useCallback(
    (products: ProductWithCategory[]) => {
      if (optimisticUpdates.size === 0) return products;
      return products.map((product) => {
        const optimisticUpdate = optimisticUpdates.get(product.id);
        return optimisticUpdate ? { ...product, ...optimisticUpdate } : product;
      });
    },
    [optimisticUpdates],
  );

  // Merge current page into accumulated list and mark end of results.
  useEffect(() => {
    if (productsPage) {
      const productsWithUpdates = applyOptimisticUpdates(productsPage);
      if (productsWithUpdates.length > 0) {
        if (page === 1) {
          setAllProducts(productsWithUpdates);
        } else {
          setAllProducts((prev) => {
            const ids = new Set(prev.map((p) => p.id));
            const newProducts = productsWithUpdates.filter(
              (p) => !ids.has(p.id),
            );
            return [...prev, ...newProducts];
          });
        }
        if (productsWithUpdates.length < PAGE_SIZE) setIsEnd(true);
      } else {
        if (page === 1) setAllProducts([]);
        setIsEnd(true);
      }
    }
  }, [productsPage, page, applyOptimisticUpdates]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/products?q=${encodeURIComponent(search)}`);
  };

  const handleSearchChange = (value: string) => setSearch(value);

  // Seed edit form state from the selected product card.
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
    setImageFile(null);
    setEditErrors({});
  };

  // Keep edit form in sync with user input and clear field-level errors.
  const handleEditChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    if (editErrors[name]) {
      setEditErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Capture a local image preview before upload.
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Validate product payload before attempting server update.
  const validateEditForm = () => {
    const payload = {
      title: editForm.title,
      description: editForm.description,
      price: parseFloat(editForm.price) || 0,
      imageUrl: editForm.imageUrl,
      categoryId: parseInt(editForm.categoryId) || 0,
    };
    const validation = productSchema.safeParse(payload);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        newErrors[field] = error.message;
      });
      setEditErrors(newErrors);
      return false;
    }
    setEditErrors({});
    return true;
  };

  // Persist edits with optimistic UI and rollback on failure.
  const handleUpdate = async (id: number) => {
    if (!validateEditForm()) return;

    const optimisticUpdate = {
      title: editForm.title,
      description: editForm.description,
      price: parseFloat(editForm.price),
      imageUrl: editForm.imageUrl,
      categoryId: parseInt(editForm.categoryId),
    };

    setOptimisticUpdates((prev) => new Map(prev.set(id, optimisticUpdate)));

    try {
      const uploadedUrl = imageFile
        ? await uploadImageToCloudinary(imageFile)
        : editForm.imageUrl;

      const updateData = {
        ...editForm,
        imageUrl: uploadedUrl,
        price: parseFloat(editForm.price),
        categoryId: parseInt(editForm.categoryId),
      };

      await updateProduct(id, updateData);

      setOptimisticUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      alert("✅ Product updated!");
      setEditingId(null);
      invalidateAdminProducts();
      router.refresh();
    } catch (error) {
      setOptimisticUpdates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });

      alert(
        "❌ Update failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    }
  };

  // Delete product with optimistic removal and refetch if request fails.
  const handleDelete = async (id: number) => {
    if (confirm("Delete this product?")) {
      setAllProducts((prev) => prev.filter((p) => p.id !== id));
      try {
        await deleteProduct(id);
        invalidateAdminProducts();
        router.refresh();
      } catch (error) {
        invalidateAdminProducts();
        alert(
          "❌ Delete failed: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      }
    }
  };

  // Pagination control for infinite "load more" behavior.
  const handleLoadMore = () => {
    if (!isEnd && !isLoading) setPage((p) => p + 1);
  };

  return {
    search,
    editingId,
    editForm,
    previewUrl,
    allProducts,
    isEnd,
    isLoading,
    editErrors,
    error,
    handleSearch,
    handleSearchChange,
    handleEditClick,
    handleEditChange,
    handleImageChange,
    handleUpdate,
    handleDelete,
    handleLoadMore,
    setEditingId,
    setImageFile,
    setPreviewUrl,
  };
}
