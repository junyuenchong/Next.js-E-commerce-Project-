import type { Product } from "@prisma/client";

/** Storefront search / filter sort keys. */
export type ProductSearchSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "oldest"
  | "name_az";

/** Partial product fields used by repository update / patch operations. */
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
