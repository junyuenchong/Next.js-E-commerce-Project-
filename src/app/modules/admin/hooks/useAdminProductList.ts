"use client";

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
import type { ProductWithCategory } from "@/app/modules/admin/types";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  adminApiPaths,
  adminProductsListUrl,
  fetchAdminCategories,
  postImageUpload,
} from "@/app/modules/admin/components/client";

type AdminCategory = { id: number; name: string };

export type AdminProductListHandle = { handleRefresh: () => void };

type ProductsPagePayload = {
  items: ProductWithCategory[];
  nextCursor: number | null;
  hasMore: boolean;
};

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

export function useAdminProductList(
  ref: Ref<AdminProductListHandle | null>,
  options?: { searchQuery?: string },
) {
  const searchQ = options?.searchQuery?.trim() ?? "";
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
  useEffect(() => {
    if (!searchResetBoot.current) {
      searchResetBoot.current = true;
      return;
    }
    setCursor(null);
    setNextCursor(null);
    setProducts([]);
  }, [searchQ]);

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

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoading || nextCursor == null) return;
    setIsLoading(true);
    setCursor(nextCursor);
  }, [hasMore, isLoading, nextCursor]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setCursor(null);
    setNextCursor(null);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

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
        pendingImageFileRef.current = file;
        setPreviewUrl(URL.createObjectURL(file));
        setEditForm((prev) => ({ ...prev, imageUrl: "" }));
      }
    },
    [],
  );

  const handleUpdate = useCallback(
    async (id: number) => {
      try {
        const stockNum = parseInt(editForm.stock, 10);
        const cap = editForm.compareAtPrice.trim();
        const file = pendingImageFileRef.current;
        let imageUrl: string | undefined =
          editForm.imageUrl.trim() || undefined;
        if (file) {
          const fd = new FormData();
          fd.append("file", file);
          const { secure_url } = await postImageUpload(fd);
          imageUrl = secure_url;
          pendingImageFileRef.current = null;
        }
        const payload = {
          id,
          title: editForm.title,
          description: editForm.description,
          price: parseFloat(editForm.price),
          compareAtPrice: cap === "" ? null : parseFloat(cap),
          stock: Number.isFinite(stockNum) ? stockNum : 0,
          categoryId: parseInt(editForm.categoryId, 10),
          ...(imageUrl !== undefined ? { imageUrl } : {}),
        };
        await http.patch(adminApiPaths.products, payload);
        setEditingId(null);
        setTimeout(() => void handleRefresh(), 200);
      } catch (error: unknown) {
        alert(getErrorMessage(error, "Failed to update product"));
      }
    },
    [editForm, handleRefresh],
  );

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

  useImperativeHandle(
    ref,
    () => ({
      handleRefresh,
    }),
    [handleRefresh],
  );

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
    products,
    isLoading,
    hasMore,
    handleLoadMore,
    itemProps,
    handleRefresh,
  };
}
