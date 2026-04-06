import slugify from "slugify";
import { categorySchema, categorySlugSchema } from "@/lib/validators";
import {
  categorySlugExists,
  createCategoryRecord,
  deleteCategoryRecord,
  findCategoryById,
  findCategoryBySlug,
  findProductsByCategorySlug,
  listCategories,
  searchCategoriesByName,
  updateCategoryRecord,
} from "./category.repository";

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
  const category = await findCategoryBySlug(parsed.slug);
  if (!category) throw new Error("Category not found");
  return category;
}

export async function getCategoryByIdService(id: number) {
  return findCategoryById(id);
}

export async function getAllCategoriesService() {
  return listCategories();
}

export async function getProductsByCategorySlugService(
  slug: string,
  limit?: number,
  page?: number,
) {
  const parsed = categorySlugSchema.parse({ slug });
  const { take, skip } = normalizePagination(limit, page);
  return findProductsByCategorySlug({
    slug: parsed.slug,
    take,
    skip,
  });
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
  return deleteCategoryRecord(id);
}

export async function searchCategoriesService(query: string) {
  const parsed = categorySchema.parse({ name: query });
  return searchCategoriesByName(parsed.name);
}
