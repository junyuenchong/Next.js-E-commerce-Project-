// Product domain services for validation, retrieval, and search flows.
import slugify from "slugify";
import {
  resolveListTake,
  resolvePageNumber,
  toPositiveOrUndefined,
} from "@/backend/shared/pagination/list-pagination";
import { productSchema, productSlugSchema } from "@/shared/schema";
import {
  attachPublicListStats,
  createProductRecord,
  softDeactivateProductById,
  findProductById,
  findProductBySlug,
  findProducts,
  findProductsCursor,
  searchProductsQuery,
  searchProductsWithFiltersQuery,
  slugExists,
  updateProductRecord,
} from "./product.repo";

/**
 * Normalize and validate product input for create/update flows.
 */
export function normalizeProductInput(data: unknown) {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid input data");
  }
  const raw = data as Record<string, unknown>;
  const stockRaw = raw.stock;
  const stockParsed =
    stockRaw === undefined || stockRaw === null || stockRaw === ""
      ? 0
      : Number(stockRaw);
  const capRaw = raw.compareAtPrice;
  let compareAtPrice: number | null | undefined;
  if (capRaw === "" || capRaw === null || capRaw === undefined) {
    compareAtPrice = null;
  } else {
    const n = Number(capRaw);
    // keep invalid compare-at values null; schema enforces compareAtPrice > price when set.
    compareAtPrice = Number.isFinite(n) && n > 0 ? n : null;
  }

  const parsed = {
    ...raw,
    price: Number(raw.price),
    categoryId: Number(raw.categoryId),
    stock: Number.isFinite(stockParsed) ? Math.trunc(stockParsed) : 0,
    compareAtPrice,
  };
  const validated = productSchema.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => {
        const path = i.path?.length ? i.path.join(".") : "root";
        return `${path}: ${i.message}`;
      })
      .join("; ");
    throw new Error(`invalid_product_data: ${issues}`);
  }
  return validated.data;
}

/**
 * Generate a unique URL-safe product slug for the given title.
 */
export async function generateUniqueProductSlug(
  name: string,
  excludeSlug?: string,
): Promise<string> {
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;
  while (await slugExists(slug)) {
    if (excludeSlug && slug === excludeSlug) break;
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}

/**
 * Create product record after schema validation and slug generation.
 */
export async function createProductService(data: unknown) {
  const validated = normalizeProductInput(data);
  const slug = await generateUniqueProductSlug(validated.title);
  return createProductRecord({ ...validated, slug });
}

/**
 * Update product record after schema validation and slug regeneration.
 */
export async function updateProductService(id: number, data: unknown) {
  const validated = normalizeProductInput(data);
  const slug = await generateUniqueProductSlug(validated.title);
  return updateProductRecord(id, { ...validated, slug });
}

/**
 * Soft-deactivate product so it no longer appears on storefront.
 */
export async function deleteProductService(id: number) {
  return softDeactivateProductById(id);
}

/**
 * Fetch storefront-visible product by slug (throws if missing).
 */
export async function getProductBySlugService(slug: string) {
  const parsed = productSlugSchema.parse({ slug });
  const product = await findProductBySlug(parsed.slug);
  if (!product) throw new Error("Product not found");
  return product;
}

/**
 * Fetch a product by id, optionally restricting to storefront-visible items.
 */
export async function getProductByIdService(
  id: string,
  options?: { storefront?: boolean },
) {
  const productId = Number(id);
  if (!Number.isFinite(productId)) throw new Error("Product not found");
  const product = await findProductById(productId, {
    activeOnly: options?.storefront === true,
  });
  if (!product) throw new Error("Product not found");
  const [withStats] = await attachPublicListStats([product]);
  return withStats;
}

/**
 * List storefront products using page-based pagination.
 */
export async function listProductsService(limit?: number, page?: number) {
  const take = resolveListTake(limit, 20);
  const skip = (resolvePageNumber(page) - 1) * take;
  const rows = await findProducts({ take, skip });
  return attachPublicListStats(rows);
}

/**
 * List storefront products using cursor-based pagination.
 */
export async function listProductsCursorService(
  limit?: number,
  cursorId?: number,
) {
  const take = resolveListTake(limit, 20);
  const rows = await findProductsCursor({
    take,
    cursorId: toPositiveOrUndefined(cursorId),
  });
  return attachPublicListStats(rows);
}

/**
 * Search storefront products by keyword, falling back to default list.
 */
export async function searchProductsService(query: string) {
  if (!query.trim()) return listProductsService();
  const rows = await searchProductsQuery(query.trim());
  return attachPublicListStats(rows);
}

/**
 * Search storefront products with optional facets and sorting.
 */
export async function searchProductsWithFiltersService(filters: {
  query?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: string;
  take?: number;
}) {
  const rows = await searchProductsWithFiltersQuery(filters);
  return attachPublicListStats(rows);
}
