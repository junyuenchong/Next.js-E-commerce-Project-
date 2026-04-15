import type { QueryKey } from "@tanstack/react-query";
import { useRealtimeQuery } from "./useRealtimeQuery";
import { fetchCategories } from "@/app/modules/user/components/client/http";

export function useUserCategoriesList() {
  return useRealtimeQuery(["user-categories"], fetchCategories, {
    channels: "categories",
    matchKey: (key: QueryKey) =>
      Array.isArray(key) && key[0] === "user-categories",
  });
}
