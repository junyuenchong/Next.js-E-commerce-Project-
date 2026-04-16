// Feature: Handles product domain services for admin maintenance and storefront product retrieval.
import slugify from "slugify";
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

function normalizePagination(limit?: number, page?: number) {
  const take = limit && limit > 0 ? limit : 20;
  const skip = take && page && page > 1 ? (page - 1) * take : 0;
  return { take, skip };
}

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
    // Guard: keep invalid compare-at values null; schema enforces compareAtPrice > price when set.
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

// Feature: generate unique URL-safe product slug for title.
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

// Feature: create product record after schema validation and slug generation.
export async function createProductService(data: unknown) {
  const validated = normalizeProductInput(data);
  const slug = await generateUniqueProductSlug(validated.title);
  return createProductRecord({ ...validated, slug });
}

// Feature: update product record after schema validation and slug regeneration.
export async function updateProductService(id: number, data: unknown) {
  const validated = normalizeProductInput(data);
  const slug = await generateUniqueProductSlug(validated.title);
  return updateProductRecord(id, { ...validated, slug });
}

// Guard: soft-deactivate product so it no longer appears on storefront.
export async function deleteProductService(id: number) {
  return softDeactivateProductById(id);
}

// Guard: fetch storefront-visible product by slug (throws if missing).
export async function getProductBySlugService(slug: string) {
  const parsed = productSlugSchema.parse({ slug });
  const product = await findProductBySlug(parsed.slug);
  if (!product) throw new Error("Product not found");
  return product;
}

// Guard: storefront mode returns active products only; admin mode may read inactive rows by id.
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

// Feature: list storefront products using page-based pagination.
export async function listProductsService(limit?: number, page?: number) {
  const { take, skip } = normalizePagination(limit, page);
  const rows = await findProducts({ take, skip });
  return attachPublicListStats(rows);
}

// Feature: list storefront products using cursor-based pagination.
export async function listProductsCursorService(
  limit?: number,
  cursorId?: number,
) {
  const take = limit && limit > 0 ? limit : 20;
  const rows = await findProductsCursor({ take, cursorId });
  return attachPublicListStats(rows);
}

// Fallback: search storefront products by keyword, falling back to default list.
export async function searchProductsService(query: string) {
  if (!query.trim()) return listProductsService();
  const rows = await searchProductsQuery(query.trim());
  return attachPublicListStats(rows);
}

// Feature: search storefront products with optional facets and sorting.
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
