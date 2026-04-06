"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCachedJson, setCachedJson, deleteCacheKeys } from "@/lib/redis";
import { publishAdminCategoryEvent } from "@/lib/admin-events";
import { cacheKeys } from "@/lib/cache-keys";
import { listProductsService } from "@/modules/product/product.service";
import {
  createCategoryService,
  deleteCategoryService,
  getAllCategoriesService,
  getCategoryByIdService,
  getCategoryBySlugService,
  getProductsByCategorySlugService,
  searchCategoriesService,
  updateCategoryService,
} from "@/modules/category/category.service";

/* ----------------------
 GET CATEGORY BY SLUG
------------------------- */
export async function getCategoryBySlug(slug: string) {
  const cacheKey = cacheKeys.categoryBySlug(slug);
  const cached = await getCachedJson<unknown>(cacheKey);
  if (cached) return cached;

  const category = await getCategoryBySlugService(slug);

  await setCachedJson(cacheKey, category);

  return category;
}

/* ----------------------
 GET ALL PRODUCTS
------------------------- */
export async function getAllProducts(limit?: number, page?: number) {
  const take = limit && limit > 0 ? limit : 20;
  const cacheKey = `products:all:${limit || "all"}:${page || 1}`;
  const cached = await getCachedJson<unknown[]>(cacheKey);
  if (cached) return cached;

  const products = await listProductsService(take, page);

  await setCachedJson(cacheKey, products);

  return products;
}

/* ----------------------
 GET PRODUCTS BY CATEGORY SLUG
------------------------- */
export async function getProductsByCategorySlug(
  slug: string,
  limit?: number,
  page?: number,
) {
  const products = await getProductsByCategorySlugService(slug, limit, page);
  await setCachedJson(
    cacheKeys.productsByCategory(
      slug,
      (limit ?? "all") as number | "all",
      page || 1,
    ),
    products,
  );

  return products;
}

/* ----------------------
 CREATE CATEGORY
------------------------- */
export async function createCategory(name: string) {
  try {
    const category = await createCategoryService(name);

    revalidatePath("/admin/categories");

    // Invalidate category-related caches
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

/* ----------------------
 GET ALL CATEGORIES
------------------------- */
export async function getAllCategories() {
  return await getAllCategoriesService();
}

/* ----------------------
 GET CATEGORY BY ID
------------------------- */
export async function getCategoryById(id: number) {
  return await getCategoryByIdService(id);
}

/* ----------------------
 UPDATE CATEGORY
------------------------- */
export async function updateCategory(id: number, name: string) {
  try {
    const updated = await updateCategoryService(id, name);
    if ("message" in updated) return updated;

    revalidatePath("/admin/categories");

    await deleteCacheKeys([
      cacheKeys.categoriesAll(),
      cacheKeys.categoryBySlug(updated.slug),
    ]);

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

/* ----------------------
 DELETE CATEGORY
------------------------- */
export async function deleteCategory(id: number) {
  try {
    const deleted = await deleteCategoryService(id);

    revalidatePath("/admin/categories");

    await deleteCacheKeys([cacheKeys.categoriesAll()]);

    await publishAdminCategoryEvent({ kind: "deleted", id: deleted.id });

    return deleted;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // Record not found
      console.log("[DEBUG] Tried to delete non-existent category with id:", id);
      return { message: "Category not found or already deleted." };
    }
    throw error;
  }
}

/* ----------------------
 SEARCH CATEGORIES BY NAME
------------------------- */
export async function searchCategories(query: string) {
  return await searchCategoriesService(query);
}
