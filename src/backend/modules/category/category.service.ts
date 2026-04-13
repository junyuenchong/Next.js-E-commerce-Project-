import slugify from "slugify";
import { categorySchema, categorySlugSchema } from "./schema/category.schema";
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
  const baseSlug = slugify(name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;
  while (await categorySlugExists(slug)) {
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
}

export async function getCategoryBySlugService(slug: string) {
  const parsed = categorySlugSchema.parse({ slug });
  const category = await findCategoryBySlug(parsed.slug, { activeOnly: true });
  if (!category) throw new Error("Category not found");
  return category;
}

export async function getCategoryByIdService(id: number) {
  return findCategoryById(id);
}

/** Admin list: active categories only (soft-removed are hidden like a real delete). */
export async function getAllCategoriesService() {
  return listCategoriesActive();
}

/** Storefront / public category list API. */
export async function getStorefrontCategoriesService() {
  return listCategoriesActive();
}

export async function getProductsByCategorySlugService(
  slug: string,
  limit?: number,
  page?: number,
) {
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
  const parsed = categorySchema.parse({ name });
  const slug = await generateUniqueCategorySlug(parsed.name);
  return createCategoryRecord({
    name: parsed.name.trim(),
    slug,
  });
}

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

export async function deleteCategoryService(id: number) {
  return softDeactivateCategoryRecord(id);
}

export async function searchCategoriesService(query: string) {
  const parsed = categorySchema.parse({ name: query });
  return searchCategoriesByName(parsed.name);
}
