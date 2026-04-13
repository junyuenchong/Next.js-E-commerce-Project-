import type { QueryKey } from "@tanstack/react-query";

export const qk = {
  user: {
    productsList: (
      categorySlug: string | null,
      cursor: number | null,
    ): QueryKey => [
      "products",
      "list",
      { scope: "user", categorySlug, cursor },
    ],
    productDetail: (id: string): QueryKey => [
      "products",
      "detail",
      { scope: "user", id },
    ],
    categoryDetail: (slug: string): QueryKey => [
      "categories",
      "detail",
      { scope: "user", slug },
    ],
  },
  admin: {
    productsList: (fetchUrl: string): QueryKey => [
      "products",
      "list",
      { scope: "admin", fetchUrl },
    ],
    categories: (): QueryKey => ["categories", "list", { scope: "admin" }],
  },
} as const;
