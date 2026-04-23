import type { QueryKey } from "@tanstack/react-query";
import { useRealtimeQuery } from "./useRealtimeQuery";
import { fetchCategories } from "@/app/lib/api/user";

export function useUserCategoriesList() {
  // auto-invalidate category list query from realtime category updates.
  return useRealtimeQuery(["user-categories"], fetchCategories, {
    channels: "categories",
    matchKey: (key: QueryKey) =>
      Array.isArray(key) && key[0] === "user-categories",
  });
}
