import type { Product } from "@prisma/client";

export type ProductSearchSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "oldest"
  | "name_az";

export type ProductInput = Partial<
  Pick<
    Product,
    | "title"
    | "slug"
    | "description"
    | "price"
    | "compareAtPrice"
    | "imageUrl"
    | "categoryId"
  >
>;
