// exposes category actions for admin management and cached category reads.
"use server";

import { Prisma } from "@prisma/client";
import {
  getCachedJson,
  setCachedJson,
  cacheKeys,
} from "@/backend/modules/db/redis";
import { publishAdminCategoryEvent } from "@/backend/modules/admin-events";
import { requireAdminPermission } from "@/backend/core/require-admin-permission";
import { listProductsService } from "@/backend/modules/product/product.service";
import { runAdminMutationEffects } from "@/backend/shared/admin-mutation-effects";
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

function mapCategoryMutationError(error: unknown): unknown {
  // normalize Prisma write errors to stable UI-facing category messages.
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return error;
  if (error.code === "P2002") {
    return new Error("A category with this name or slug already exists.");
  }
  if (error.code === "P2025") {
    return { message: "Category not found or already deleted." };
  }
  return error;
}

/**
 * Handles get category by slug action.
 */
export async function getCategoryBySlugAction(slug: string) {
  // read-through cache for category detail lookups by slug.
  const cacheKey = cacheKeys.categoryBySlug(slug);
  const cached = await getCachedJson<unknown>(cacheKey);
  if (cached) return cached;
  const category = await getCategoryBySlugService(slug);
  await setCachedJson(cacheKey, category);
  return category;
}

/**
 * Handles get all products by category action.
 */
export async function getAllProductsByCategoryAction(
  limit?: number,
  page?: number,
) {
  // legacy paged product list cache path used by category/product UIs.
  const take = limit && limit > 0 ? limit : 20;
  const cacheKey = cacheKeys.productsList(take, page || 1);
  const cached = await getCachedJson<unknown[]>(cacheKey);
  if (cached) return cached;
  const products = await listProductsService(take, page);
  await setCachedJson(cacheKey, products);
  return products;
}

/**
 * Handles get products by category slug action.
 */
export async function getProductsByCategorySlugAction(
  slug: string,
  limit?: number,
  page?: number,
) {
  // category-scoped listing with cache keys partitioned by slug and paging.
  const take = (limit ?? "all") as number | "all";
  const p = page || 1;
  const cacheKey = cacheKeys.productsByCategory(slug, take, p);
  const cached = await getCachedJson<unknown[]>(cacheKey);
  if (cached) return cached;
  const products = await getProductsByCategorySlugService(slug, limit, page);
  await setCachedJson(cacheKey, products);
  return products;
}

/**
 * Handles get products by category slug cursor action.
 */
export async function getProductsByCategorySlugCursorAction(
  slug: string,
  limit?: number,
  cursorId?: number,
) {
  // cursor variant for infinite-scroll category product pages.
  return getProductsByCategorySlugCursorService(slug, limit, cursorId);
}

/**
 * Handles create category action.
 */
export async function createCategoryAction(name: string) {
  // admin create path is permission-gated before any mutation.
  await requireAdminPermission("product.update");
  try {
    const category = await createCategoryService(name);
    await runAdminMutationEffects({
      paths: ["/features/admin/categories"],
      cacheKeys: [cacheKeys.categoriesAll()],
      publish: () =>
        publishAdminCategoryEvent({ kind: "created", id: category.id }),
    });
    return category;
  } catch (error: unknown) {
    throw mapCategoryMutationError(error);
  }
}

/**
 * Handles get all categories action.
 */
export async function getAllCategoriesAction() {
  // shared action wrapper for admin/public category list reads.
  return getAllCategoriesService();
}

/**
 * Handles get category by id action.
 */
export async function getCategoryByIdAction(id: number) {
  // internal/admin lookup by numeric category id.
  return getCategoryByIdService(id);
}

/**
 * Handles update category action.
 */
export async function updateCategoryAction(id: number, name: string) {
  // admin update path invalidates current and previous slug cache keys.
  const existing = await getCategoryByIdService(id);
  try {
    const updated = await updateCategoryService(id, name);
    if ("message" in updated) return updated;
    const keys = [
      cacheKeys.categoriesAll(),
      cacheKeys.categoryBySlug(updated.slug),
    ];
    if (existing?.slug && existing.slug !== updated.slug) {
      keys.push(cacheKeys.categoryBySlug(existing.slug));
    }
    const patterns = [cacheKeys.productsByCategoryPattern(updated.slug)];
    if (existing?.slug && existing.slug !== updated.slug) {
      patterns.push(cacheKeys.productsByCategoryPattern(existing.slug));
    }
    patterns.push(cacheKeys.productListPattern());
    await runAdminMutationEffects({
      paths: ["/features/admin/categories"],
      cacheKeys: keys,
      cachePatterns: patterns,
      publish: () =>
        publishAdminCategoryEvent({ kind: "updated", id: updated.id }),
    });
    return updated;
  } catch (error: unknown) {
    throw mapCategoryMutationError(error);
  }
}

/**
 * Handles delete category action.
 */
export async function deleteCategoryAction(id: number) {
  // soft-delete with related product-list cache and event invalidation.
  await requireAdminPermission("product.delete");
  try {
    const deleted = await deleteCategoryService(id);
    await runAdminMutationEffects({
      paths: ["/features/admin/categories"],
      cacheKeys: [
        cacheKeys.categoriesAll(),
        cacheKeys.categoryBySlug(deleted.slug),
      ],
      cachePatterns: [
        cacheKeys.productsByCategoryPattern(deleted.slug),
        cacheKeys.productListPattern(),
      ],
      publish: () =>
        publishAdminCategoryEvent({ kind: "deleted", id: deleted.id }),
    });
    return deleted;
  } catch (error: unknown) {
    const mapped = mapCategoryMutationError(error);
    if (mapped && typeof mapped === "object" && "message" in mapped) {
      return mapped as { message: string };
    }
    throw mapped;
  }
}

/**
 * Handles search categories action.
 */
export async function searchCategoriesAction(query: string) {
  // lightweight admin search for selectors/autocomplete.
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
