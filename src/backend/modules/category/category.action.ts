"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  deleteCacheKeys,
  deleteCacheKeysByPattern,
  getCachedJson,
  setCachedJson,
  cacheKeys,
} from "@/backend/modules/db/redis";
import { publishAdminCategoryEvent } from "@/backend/modules/admin-events";
import { requireAdminPermission } from "@/backend/core/require-admin-permission";
import { listProductsService } from "@/backend/modules/product/product.service";
import {
  createCategoryService,
  deleteCategoryService,
  getAllCategoriesService,
  getCategoryByIdService,
  getCategoryBySlugService,
  getProductsByCategorySlugCursorService,
  getProductsByCategorySlugService,
  searchCategoriesService,
  updateCategoryService,
} from "./category.service";

export async function getCategoryBySlugAction(slug: string) {
  const cacheKey = cacheKeys.categoryBySlug(slug);
  const cached = await getCachedJson<unknown>(cacheKey);
  if (cached) return cached;
  const category = await getCategoryBySlugService(slug);
  await setCachedJson(cacheKey, category);
  return category;
}

export async function getAllProductsByCategoryAction(
  limit?: number,
  page?: number,
) {
  const take = limit && limit > 0 ? limit : 20;
  const cacheKey = cacheKeys.productsList(take, page || 1);
  const cached = await getCachedJson<unknown[]>(cacheKey);
  if (cached) return cached;
  const products = await listProductsService(take, page);
  await setCachedJson(cacheKey, products);
  return products;
}

export async function getProductsByCategorySlugAction(
  slug: string,
  limit?: number,
  page?: number,
) {
  const take = (limit ?? "all") as number | "all";
  const p = page || 1;
  const cacheKey = cacheKeys.productsByCategory(slug, take, p);
  const cached = await getCachedJson<unknown[]>(cacheKey);
  if (cached) return cached;
  const products = await getProductsByCategorySlugService(slug, limit, page);
  await setCachedJson(cacheKey, products);
  return products;
}

export async function getProductsByCategorySlugCursorAction(
  slug: string,
  limit?: number,
  cursorId?: number,
) {
  return getProductsByCategorySlugCursorService(slug, limit, cursorId);
}

export async function createCategoryAction(name: string) {
  await requireAdminPermission("product.update");
  try {
    const category = await createCategoryService(name);
    await revalidatePath("/modules/admin/categories");
    await deleteCacheKeys([cacheKeys.categoriesAll()]);
    await publishAdminCategoryEvent({ kind: "created", id: category.id });
    return category;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Category with this name already exists.");
    }
    throw error;
  }
}

export async function getAllCategoriesAction() {
  return getAllCategoriesService();
}

export async function getCategoryByIdAction(id: number) {
  return getCategoryByIdService(id);
}

export async function updateCategoryAction(id: number, name: string) {
  const existing = await getCategoryByIdService(id);
  try {
    const updated = await updateCategoryService(id, name);
    if ("message" in updated) return updated;
    await revalidatePath("/modules/admin/categories");
    const keys = [
      cacheKeys.categoriesAll(),
      cacheKeys.categoryBySlug(updated.slug),
    ];
    if (existing?.slug && existing.slug !== updated.slug) {
      keys.push(cacheKeys.categoryBySlug(existing.slug));
    }
    await deleteCacheKeys(keys);
    await deleteCacheKeysByPattern(
      cacheKeys.productsByCategoryPattern(updated.slug),
    );
    if (existing?.slug && existing.slug !== updated.slug) {
      await deleteCacheKeysByPattern(
        cacheKeys.productsByCategoryPattern(existing.slug),
      );
    }
    await deleteCacheKeysByPattern(cacheKeys.productListPattern());
    await publishAdminCategoryEvent({ kind: "updated", id: updated.id });
    return updated;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("A category with this name or slug already exists.");
    }
    throw error;
  }
}

export async function deleteCategoryAction(id: number) {
  await requireAdminPermission("product.delete");
  try {
    const deleted = await deleteCategoryService(id);
    await revalidatePath("/modules/admin/categories");
    await deleteCacheKeys([
      cacheKeys.categoriesAll(),
      cacheKeys.categoryBySlug(deleted.slug),
    ]);
    await deleteCacheKeysByPattern(
      cacheKeys.productsByCategoryPattern(deleted.slug),
    );
    await deleteCacheKeysByPattern(cacheKeys.productListPattern());
    await publishAdminCategoryEvent({ kind: "deleted", id: deleted.id });
    return deleted;
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { message: "Category not found or already deleted." };
    }
    throw error;
  }
}

export async function searchCategoriesAction(query: string) {
  return searchCategoriesService(query);
}

export const getCategoryBySlug = getCategoryBySlugAction;
export const getAllProducts = getAllProductsByCategoryAction;
export const getProductsByCategorySlug = getProductsByCategorySlugAction;
export const getProductsByCategorySlugCursor =
  getProductsByCategorySlugCursorAction;
export const createCategory = createCategoryAction;
export const getAllCategories = getAllCategoriesAction;
export const getCategoryById = getCategoryByIdAction;
export const updateCategory = updateCategoryAction;
export const deleteCategory = deleteCategoryAction;
export const searchCategories = searchCategoriesAction;
