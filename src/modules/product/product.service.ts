import slugify from "slugify";
import { productSchema, productSlugSchema } from "@/lib/validators";
import {
  createProductRecord,
  deleteProductRecord,
  findProductById,
  findProductBySlug,
  findProducts,
  findProductsCursor,
  searchProductsQuery,
  slugExists,
  updateProductRecord,
} from "./product.repository";

// Product service: validates product input and coordinates repository operations.
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
  const parsed = {
    ...raw,
    price: Number(raw.price),
    categoryId: Number(raw.categoryId),
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
  return deleteProductRecord(id);
}

export async function getProductBySlugService(slug: string) {
  const parsed = productSlugSchema.parse({ slug });
  const product = await findProductBySlug(parsed.slug);
  if (!product) throw new Error("Product not found");
  return product;
}

export async function getProductByIdService(id: string) {
  const productId = Number(id);
  if (!Number.isFinite(productId)) throw new Error("Product not found");
  const product = await findProductById(productId);
  if (!product) throw new Error("Product not found");
  return product;
}

export async function listProductsService(limit?: number, page?: number) {
  const { take, skip } = normalizePagination(limit, page);
  return findProducts({ take, skip });
}

export async function listProductsCursorService(
  limit?: number,
  cursorId?: number,
) {
  const take = limit && limit > 0 ? limit : 20;
  return findProductsCursor({ take, cursorId });
}

export async function searchProductsService(query: string) {
  if (!query.trim()) return listProductsService();
  return searchProductsQuery(query.trim());
}
