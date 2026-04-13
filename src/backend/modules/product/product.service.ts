import slugify from "slugify";
import { productSchema, productSlugSchema } from "./schema/product.schema";
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
    throw new Error("Invalid product data");
  }
  return validated.data;
}

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

export async function createProductService(data: unknown) {
  const validated = normalizeProductInput(data);
  const slug = await generateUniqueProductSlug(validated.title);
  return createProductRecord({ ...validated, slug });
}

export async function updateProductService(id: number, data: unknown) {
  const validated = normalizeProductInput(data);
  const slug = await generateUniqueProductSlug(validated.title);
  return updateProductRecord(id, { ...validated, slug });
}

export async function deleteProductService(id: number) {
  return softDeactivateProductById(id);
}

export async function getProductBySlugService(slug: string) {
  const parsed = productSlugSchema.parse({ slug });
  const product = await findProductBySlug(parsed.slug);
  if (!product) throw new Error("Product not found");
  return product;
}

/** Storefront: only active products. Admin single-product fetch can still load inactive by id for edits. */
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

export async function listProductsService(limit?: number, page?: number) {
  const { take, skip } = normalizePagination(limit, page);
  const rows = await findProducts({ take, skip });
  return attachPublicListStats(rows);
}

export async function listProductsCursorService(
  limit?: number,
  cursorId?: number,
) {
  const take = limit && limit > 0 ? limit : 20;
  const rows = await findProductsCursor({ take, cursorId });
  return attachPublicListStats(rows);
}

export async function searchProductsService(query: string) {
  if (!query.trim()) return listProductsService();
  const rows = await searchProductsQuery(query.trim());
  return attachPublicListStats(rows);
}

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
