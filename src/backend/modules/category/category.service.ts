// Category domain services for CRUD, slug generation, and listing flows.
import slugify from "slugify";
import {
  resolveOffsetPage,
  resolveListTake,
  toPositiveOrUndefined,
} from "@/backend/shared/pagination/list-pagination";
import { categorySchema, categorySlugSchema } from "@/shared/schema";
import { attachPublicListStats } from "@/backend/modules/product/product.repo";
import {
  categorySlugExists,
  createCategoryRecord,
  softDeactivateCategoryRecord,
  findCategoryById,
  findCategoryBySlug,
  findProductsByCategorySlug,
  findProductsByCategorySlugCursor,
  listCategoriesActive,
  searchCategoriesByName,
  updateCategoryRecord,
} from "./category.repo";

export async function generateUniqueCategorySlug(
  name: string,
): Promise<string> {
  // Generates a unique slug by checking existing records and appending a counter when needed.
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;
  while (await categorySlugExists(slug)) {
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}

/**
 * Get one storefront-visible category by slug (active-only).
 */
export async function getCategoryBySlugService(slug: string) {
  const parsed = categorySlugSchema.parse({ slug });
  const category = await findCategoryBySlug(parsed.slug, { activeOnly: true });
  if (!category) throw new Error("Category not found");
  return category;
}

/**
 * Get one category by numeric id (admin/internal).
 */
export async function getCategoryByIdService(id: number) {
  return findCategoryById(id);
}

/**
 * List categories for admin UI (active-only).
 */
export async function getAllCategoriesService() {
  return listCategoriesActive();
}

/**
 * List categories for storefront UI (active-only).
 */
export async function getStorefrontCategoriesService() {
  return listCategoriesActive();
}

/**
 * List products by category slug (page-based pagination).
 */
export async function getProductsByCategorySlugService(
  slug: string,
  limit?: number,
  page?: number,
) {
  const parsed = categorySlugSchema.parse({ slug });
  const { take, skip } = resolveOffsetPage({ limit, page });
  const rows = await findProductsByCategorySlug({
    slug: parsed.slug,
    take,
    skip,
  });
  return attachPublicListStats(rows);
}

/**
 * List products by category slug (cursor-based pagination).
 */
export async function getProductsByCategorySlugCursorService(
  slug: string,
  limit?: number,
  cursorId?: number,
) {
  const parsed = categorySlugSchema.parse({ slug });
  const take = resolveListTake(limit, 20);
  const rows = await findProductsByCategorySlugCursor({
    slug: parsed.slug,
    take,
    cursorId: toPositiveOrUndefined(cursorId),
  });
  return attachPublicListStats(rows);
}

/**
 * Create a new active category record (admin).
 */
export async function createCategoryService(name: string) {
  const parsed = categorySchema.parse({ name });
  const slug = await generateUniqueCategorySlug(parsed.name);
  return createCategoryRecord({
    name: parsed.name.trim(),
    slug,
  });
}

/**
 * Update category name (and regenerate slug) (admin).
 */
export async function updateCategoryService(id: number, name: string) {
  const parsed = categorySchema.parse({ name });
  const existing = await findCategoryById(id);
  if (!existing) {
    return { message: "Category not found or already deleted." };
  }
  const slug = await generateUniqueCategorySlug(parsed.name);
  return updateCategoryRecord(id, {
    name: parsed.name.trim(),
    slug,
  });
}

/**
 * Soft-delete (deactivate) category so storefront hides it.
 */
export async function deleteCategoryService(id: number) {
  return softDeactivateCategoryRecord(id);
}

/**
 * Search categories by name (admin picker/autocomplete).
 */
export async function searchCategoriesService(query: string) {
  const parsed = categorySchema.parse({ name: query });
  return searchCategoriesByName(parsed.name);
}
