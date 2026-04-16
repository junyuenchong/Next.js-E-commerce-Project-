import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeQuery } from "./useRealtimeQuery";
import { qk } from "@/app/lib/query-keys";
import {
  fetchProductsByUrl,
  productsListUrl,
} from "@/app/features/user/components/client/http";
import type { ProductCardProduct } from "@/app/features/user/types";

const PAGE_SIZE = 10;

export function useProductList(
  categorySlug: string | undefined,
  initialProducts: ProductCardProduct[] | undefined,
) {
  const [products, setProducts] = useState<ProductCardProduct[]>(
    initialProducts ?? [],
  );
  const [isLoading, setIsLoading] = useState(false);
  /** `null` = first page (no `cursor` query param). Non-null = load-more cursor (last seen id). */
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(() => {
    const list = initialProducts ?? [];
    return list.length > 0 ? list[list.length - 1].id : null;
  });
  const [hasMore, setHasMore] = useState(() =>
    initialProducts != null && initialProducts.length > 0
      ? initialProducts.length === PAGE_SIZE
      : true,
  );

  const url = useMemo(
    () => productsListUrl(categorySlug, PAGE_SIZE, cursor),
    [categorySlug, cursor],
  );

  const { data } = useRealtimeQuery(
    qk.user.productsList(categorySlug ?? null, cursor),
    () => fetchProductsByUrl(url),
    {
      channels: "products",
      initialData:
        cursor === null && initialProducts != null && initialProducts.length > 0
          ? initialProducts
          : undefined,
      staleTime: 0,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  );

  useEffect(() => {
    if (!data) return;
    const items = Array.isArray(data)
      ? data
      : (data as { items?: ProductCardProduct[] })?.items;
    const next =
      !Array.isArray(data) && data && typeof data === "object"
        ? ((data as { nextCursor?: number | null }).nextCursor ?? null)
        : null;

    if (Array.isArray(items)) {
      setProducts((prev) => {
        if (cursor == null) return items;
        const seen = new Set(prev.map((p) => p.id));
        const appended = items.filter((p) => !seen.has(p.id));
        return [...prev, ...appended];
      });
      setHasMore(items.length === PAGE_SIZE);
      setNextCursor(
        next ?? (items.length > 0 ? items[items.length - 1].id : null),
      );
    }
    setIsLoading(false);
  }, [data, cursor]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || nextCursor == null) return;
    setIsLoading(true);
    setCursor(nextCursor);
  }, [hasMore, isLoading, nextCursor]);

  return { products, isLoading, hasMore, loadMore };
}
