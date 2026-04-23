import type { Category } from "@prisma/client";
import { useRealtimeQuery } from "./useRealtimeQuery";
import { qk } from "@/app/lib/realtime";
import { fetchCategoryBySlug } from "@/app/lib/api/user";

export function useCategoryDetail(slug: string, initialCategory?: Category) {
  return useRealtimeQuery(
    qk.user.categoryDetail(slug),
    () => fetchCategoryBySlug(slug),
    {
      channels: "categories",
      initialData: initialCategory,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  );
}
