// Feature: Implements category services for CRUD management, slug rules, and cached reads.
import slugify from "slugify";
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

function normalizePagination(limit?: number, page?: number) {
  const take = limit && limit > 0 ? limit : undefined;
  const skip = take && page && page > 1 ? (page - 1) * take : undefined;
  return { take, skip };
}

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

export async function getCategoryBySlugService(slug: string) {
  // Storefront-safe lookup: validates slug and enforces active-only category visibility.
  const parsed = categorySlugSchema.parse({ slug });
  const category = await findCategoryBySlug(parsed.slug, { activeOnly: true });
  if (!category) throw new Error("Category not found");
  return category;
}

export async function getCategoryByIdService(id: number) {
  // Admin/internal lookup by numeric id (may return inactive rows depending on repo behavior).
  return findCategoryById(id);
}

// Guard: admin category list returns active categories only.
export async function getAllCategoriesService() {
  return listCategoriesActive();
}

// Feature: storefront/public category list API.
export async function getStorefrontCategoriesService() {
  return listCategoriesActive();
}

export async function getProductsByCategorySlugService(
  slug: string,
  limit?: number,
  page?: number,
) {
  // Storefront product listing by category slug with optional page-based pagination.
  const parsed = categorySlugSchema.parse({ slug });
  const { take, skip } = normalizePagination(limit, page);
  const rows = await findProductsByCategorySlug({
    slug: parsed.slug,
    take,
    skip,
  });
  return attachPublicListStats(rows);
}

export async function getProductsByCategorySlugCursorService(
  slug: string,
  limit?: number,
  cursorId?: number,
) {
  // Cursor-based listing used by infinite scroll UIs; returns stats-enriched rows.
  const parsed = categorySlugSchema.parse({ slug });
  const take = limit && limit > 0 ? limit : 20;
  const rows = await findProductsByCategorySlugCursor({
    slug: parsed.slug,
    take,
    cursorId,
  });
  return attachPublicListStats(rows);
}

export async function createCategoryService(name: string) {
  // Validates name, generates unique slug, and persists a new active category record.
  const parsed = categorySchema.parse({ name });
  const slug = await generateUniqueCategorySlug(parsed.name);
  return createCategoryRecord({
    name: parsed.name.trim(),
    slug,
  });
}

export async function updateCategoryService(id: number, name: string) {
  // Validates name and updates category; returns message object when target row is missing.
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

export async function deleteCategoryService(id: number) {
  // Soft-deactivates category so storefront hides it while preserving historical references.
  return softDeactivateCategoryRecord(id);
}

export async function searchCategoriesService(query: string) {
  // Lightweight name search used by admin pickers/autocomplete.
  const parsed = categorySchema.parse({ name: query });
  return searchCategoriesByName(parsed.name);
}
