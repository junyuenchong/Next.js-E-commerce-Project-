"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRealtimeQuery } from "@/app/lib/realtime";

type CategoryRow = { id: number; slug: string; name: string };

// Keep header dropdown state and data fetching out of the component.
export function useHeaderCategorySelector() {
  const { data } = useRealtimeQuery(
    ["user-categories"],
    async () => {
      const response = await fetch("/features/user/api/categories");
      return response.json();
    },
    {
      channels: "categories",
      matchKey: (key: QueryKey) =>
        Array.isArray(key) && key[0] === "user-categories",
    },
  );

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const categories = useMemo(() => {
    const raw = Array.isArray(data) ? data : [];
    return raw as CategoryRow[];
  }, [data]);

  const toggleOpen = useCallback(() => setOpen((v) => !v), []);

  const pickCategory = useCallback(
    (slug: string) => {
      setOpen(false);
      router.push(`/features/user/category/${slug}`);
    },
    [router],
  );

  return { categories, open, toggleOpen, pickCategory, dropdownRef };
}
