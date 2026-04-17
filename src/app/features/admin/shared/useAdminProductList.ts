"use client";

/**
 * Admin products table: pagination, sorting, inline edit, and delete actions.
 */

import {
  useState,
  useImperativeHandle,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type Ref,
} from "react";
import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import type { ProductWithCategory } from "@/app/features/admin/types";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  adminApiPaths,
  adminProductsListUrl,
  fetchAdminCategories,
  postImageUpload,
} from "@/app/features/admin/components/client";
import { buildAdminProductPayload } from "./product-form";
import { trySetFieldErrorsFromAxios400 } from "./field-errors";

type AdminCategory = { id: number; name: string };

export type AdminProductListHandle = { handleRefresh: () => void };

type ProductsPagePayload = {
  items: ProductWithCategory[];
  nextCursor: number | null;
  hasMore: boolean;
};

// Upload helper for edited product images.
async function uploadImageIfNeeded(
  file: File | null,
): Promise<string | undefined> {
  if (!file) return undefined;
  const fd = new FormData();
  fd.append("file", file);
  const { secure_url } = await postImageUpload(fd);
  return secure_url;
}

// Normalize backend list response into one paging shape.
async function fetchAdminProductsPage(
  url: string,
  isSearchMode: boolean,
): Promise<ProductsPagePayload> {
  const res = await http.get<
    | ProductWithCategory[]
    | { items: ProductWithCategory[]; nextCursor?: number | null }
  >(url);
  const raw = res.data;
  const items: ProductWithCategory[] = Array.isArray(raw)
    ? (raw as ProductWithCategory[])
    : Array.isArray((raw as { items?: ProductWithCategory[] }).items)
      ? (raw as { items: ProductWithCategory[] }).items
      : [];
  const hasMore = !isSearchMode && items.length === ADMIN_PRODUCTS_PAGE_SIZE;
  const last = items.length > 0 ? items[items.length - 1] : undefined;
  return {
    items,
    hasMore,
    nextCursor: hasMore && last ? last.id : null,
  };
}

// Manages product list state, pagination, sorting, and row actions.
export function useAdminProductList(
  ref: Ref<AdminProductListHandle | null>,
  options?: {
    searchQuery?: string;
    sortKey?:
      | "relevance"
      | "nameAZ"
      | "nameZA"
      | "priceLowToHigh"
      | "priceHighToLow"
      | "stockLowToHigh"
      | "stockHighToLow"
      | "recentlyUpdated";
  },
) {
  // Keep all product-list orchestration in one place.
  const searchQ = options?.searchQuery?.trim() ?? "";
  const sortKey = options?.sortKey ?? "recentlyUpdated";
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [, setIsRefreshing] = useState(false);
  const pendingImageFileRef = useRef<File | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    compareAtPrice: "",
    stock: "0",
    imageUrl: "",
    categoryId: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const url = useMemo(
    () =>
      adminProductsListUrl(
        ADMIN_PRODUCTS_PAGE_SIZE,
        cursor,
        searchQ || undefined,
      ),
    [cursor, searchQ],
  );

  const { data, refetch } = useQuery({
    queryKey: ["admin-products", cursor, searchQ],
    queryFn: () => fetchAdminProductsPage(url, Boolean(searchQ)),
  });

  const categoriesQuery = useQuery<AdminCategory[]>({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
    staleTime: 300000,
    retry: 1,
  });

  const searchResetBoot = useRef(false);
  // Reset pagination when search query changes.
  useEffect(() => {
    if (!searchResetBoot.current) {
      searchResetBoot.current = true;
      return;
    }
    setCursor(null);
    setNextCursor(null);
    setProducts([]);
  }, [searchQ]);

  // Sort the currently loaded rows on the client.
  const sortedProducts = useMemo(() => {
    // Sorting runs on loaded rows to keep cursor paging stable.
    const list = [...products];
    list.sort((a, b) => {
      switch (sortKey) {
        case "recentlyUpdated":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case "nameAZ":
          return (a.title || "").localeCompare(b.title || "");
        case "nameZA":
          return (b.title || "").localeCompare(a.title || "");
        case "priceLowToHigh":
          return Number(a.price) - Number(b.price);
        case "priceHighToLow":
          return Number(b.price) - Number(a.price);
        case "stockLowToHigh":
          return (a.stock ?? 0) - (b.stock ?? 0);
        case "stockHighToLow":
          return (b.stock ?? 0) - (a.stock ?? 0);
        case "relevance":
        default:
          return b.id - a.id;
      }
    });
    return list;
  }, [products, sortKey]);

  // Merge fetched page into local list state.
  useEffect(() => {
    if (!data) return;
    const { items, nextCursor: next, hasMore: more } = data;

    setProducts((prev) => {
      if (cursor == null) return items;
      const seen = new Set(prev.map((p) => p.id));
      const appended = items.filter((p) => !seen.has(p.id));
      return [...prev, ...appended];
    });
    setHasMore(more);
    setNextCursor(next);
    setIsLoading(false);
  }, [data, cursor]);

  // Load next page if a cursor is available.
  const handleLoadMore = useCallback(() => {
    // Ignore invalid or concurrent load-more attempts.
    if (!hasMore || isLoading || nextCursor == null) return;
    setIsLoading(true);
    setCursor(nextCursor);
  }, [hasMore, isLoading, nextCursor]);

  // Refresh from first page and clear cursors.
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setCursor(null);
    setNextCursor(null);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  // Enter edit mode and seed form with row values.
  const handleEditClick = useCallback((product: ProductWithCategory) => {
    pendingImageFileRef.current = null;
    setEditingId(product.id);
    setEditForm({
      title: product.title || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      compareAtPrice:
        product.compareAtPrice != null &&
        !Number.isNaN(Number(product.compareAtPrice))
          ? String(product.compareAtPrice)
          : "",
      stock: String(product.stock ?? 0),
      imageUrl: product.imageUrl || "",
      categoryId: String(product.categoryId ?? ""),
    });
    setPreviewUrl(product.imageUrl || null);
    setEditErrors({});
  }, []);

  // Update edit form field and clear its inline error.
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

  // Capture new image file for edit mode and refresh preview.
  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        pendingImageFileRef.current = file;
        setPreviewUrl(URL.createObjectURL(file));
        setEditForm((prev) => ({ ...prev, imageUrl: "" }));
      }
    },
    [],
  );

  // Save product edits (including optional image upload).
  const handleUpdate = useCallback(
    async (id: number) => {
      try {
        // Upload edited image before saving product changes.
        const file = pendingImageFileRef.current;
        const uploadedUrl = await uploadImageIfNeeded(file);
        if (uploadedUrl) pendingImageFileRef.current = null;
        const imageUrl = uploadedUrl ?? (editForm.imageUrl.trim() || undefined);
        const payload = {
          id,
          ...buildAdminProductPayload(editForm, { imageUrl }),
        };
        await http.patch(adminApiPaths.products, payload);
        setEditingId(null);
        setTimeout(() => void handleRefresh(), 200);
      } catch (error: unknown) {
        // Show backend field errors inline when available.
        if (trySetFieldErrorsFromAxios400(error, setEditErrors)) return;
        alert(getErrorMessage(error, "Failed to update product"));
      }
    },
    [editForm, handleRefresh],
  );

  // Soft-delete product after confirmation.
  const handleDelete = useCallback(
    async (id: number) => {
      if (
        !window.confirm(
          "Soft-delete this product? It will be hidden from the storefront.",
        )
      )
        return;
      try {
        await http.delete(
          `${adminApiPaths.products}?id=${encodeURIComponent(String(id))}`,
        );
        void handleRefresh();
      } catch (error: unknown) {
        alert(getErrorMessage(error, "Failed to delete product"));
      }
    },
    [handleRefresh],
  );

  // Expose refresh to parent via imperative ref.
  useImperativeHandle(
    ref,
    () => ({
      handleRefresh,
    }),
    [handleRefresh],
  );

  // Bundle row action props to keep row components presentational.
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
    handleEditClick,
    handleEditChange,
    handleImageChange,
    handleUpdate,
    handleDelete,
    categoriesQuery.data,
    categoriesQuery.isLoading,
  ]);

  return {
    products: sortedProducts,
    isLoading,
    hasMore,
    handleLoadMore,
    itemProps,
    handleRefresh,
  };
}
