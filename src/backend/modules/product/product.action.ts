/**
 * product action
 * handle product action logic
 */
// implements product actions for admin CRUD, search, and review workflows.
"use server";

import {
  deleteCacheKeys,
  getCachedJson,
  setCachedJson,
  cacheKeys,
} from "@/backend/modules/db/redis";
import { publishAdminProductEvent } from "@/backend/modules/admin-events";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { requireAdminPermission } from "@/backend/core/require-admin-permission";
import { getCurrentAdminUser } from "@/backend/core/session";
import { runAdminMutationEffects } from "@/backend/shared/admin-mutation-effects";
import {
  createProductService,
  deleteProductService,
  getProductByIdService,
  getProductBySlugService,
  listProductsCursorService,
  listProductsService,
  searchProductsService,
  searchProductsWithFiltersService,
  updateProductService,
} from "./product.service";

async function bustProductCaches(extraKeys: string[] = []) {
  // Keep list/detail/category queries in sync after any mutation.
  await runAdminMutationEffects({
    cacheKeys: extraKeys,
    cachePatterns: [
      cacheKeys.productListPattern(),
      cacheKeys.productsByCategoryAllPattern(),
    ],
  });
}

async function runSearchSafely<T>(task: () => Promise<T>): Promise<T | []> {
  // Search endpoints fail-open to keep UI responsive during transient DB issues.
  try {
    return await task();
  } catch (error: unknown) {
    console.error("[product-search] failed:", error);
    return [];
  }
}

// create new product from validated admin input.
export async function createProductAction(data: unknown) {
  // Permission gate is enforced at action entry to protect all call paths.
  await requireAdminPermission("product.create");
  const product = await createProductService(data);
  const actor = await getCurrentAdminUser();
  const actorId = actor ? adminActorNumericId(actor) : null;
  if (actorId != null) {
    void logAdminAction({
      actorUserId: actorId,
      action: "product.create",
      targetType: "Product",
      targetId: String(product.id),
      metadata: { title: product.title },
    });
  }
  await runAdminMutationEffects({
    paths: ["/features/admin/products"],
    tags: ["products"],
  });
  await bustProductCaches();
  await publishAdminProductEvent({ kind: "created", id: product.id });
  return product;
}

// read storefront product by slug with caching.
export async function getProductBySlugAction(slug: string) {
  // read-through cache for storefront product detail lookups.
  const cacheKey = cacheKeys.productBySlug(slug);
  const cached = await getCachedJson<unknown>(cacheKey);
  if (cached) return cached;
  const product = await getProductBySlugService(slug);
  await setCachedJson(cacheKey, product);
  return product;
}

// read product by id with caching (admin/detail use).
export async function getProductByIdAction(id: string) {
  // Admin/detail read path uses id-based cache key.
  const productId = Number(id);
  const cacheKey = cacheKeys.productById(productId);
  const cached = await getCachedJson<unknown>(cacheKey as string);
  if (cached) return cached;
  const product = await getProductByIdService(id);
  await setCachedJson(cacheKey as string, product);
  return product;
}

// list products with page-based pagination and caching.
export async function getAllProductsAction(limit?: number, page?: number) {
  // Keep legacy page-based cache contract while service supports pagination.
  const take = limit && limit > 0 ? limit : 20;
  const cacheKey = cacheKeys.productsList(take, page || 1);
  const cached = await getCachedJson<unknown[]>(cacheKey);
  if (cached) return cached;
  const products = await listProductsService(limit, page);
  await setCachedJson(cacheKey, products);
  return products;
}

// list products using cursor pagination.
export async function getAllProductsCursorAction(
  limit?: number,
  cursorId?: number,
) {
  return listProductsCursorService(limit, cursorId);
}

// update existing product and bust related caches.
export async function updateProductAction(id: number, data: unknown) {
  await requireAdminPermission("product.update");
  let previousSlug: string | undefined;
  try {
    // Capture previous slug so old slug cache can be invalidated on rename.
    const before = await getProductByIdService(String(id));
    previousSlug = before.slug;
  } catch {
    /* row missing — update will fail or replace */
  }
  const product = await updateProductService(id, data);
  const actor = await getCurrentAdminUser();
  const actorId = actor ? adminActorNumericId(actor) : null;
  if (actorId != null) {
    const keys =
      data && typeof data === "object"
        ? Object.keys(data as Record<string, unknown>)
        : [];
    void logAdminAction({
      actorUserId: actorId,
      action: "product.update",
      targetType: "Product",
      targetId: String(product.id),
      metadata: { slug: product.slug, fields: keys },
    });
  }
  await runAdminMutationEffects({
    paths: ["/features/admin/products"],
    tags: ["products"],
  });
  const keys = [
    cacheKeys.productById(id),
    cacheKeys.productBySlug(product.slug),
  ];
  if (previousSlug && previousSlug !== product.slug) {
    keys.push(cacheKeys.productBySlug(previousSlug));
  }
  await bustProductCaches(keys);
  await publishAdminProductEvent({ kind: "updated", id: product.id });
  return product;
}

// soft-delete product and invalidate list/detail caches.
export async function deleteProductAction(id: number) {
  await requireAdminPermission("product.delete");
  const actor = await getCurrentAdminUser();
  try {
    // Soft delete and invalidate both detail + list cache surfaces.
    const deleted = await deleteProductService(id);
    await runAdminMutationEffects({
      paths: ["/features/admin/products"],
      tags: ["products"],
    });
    await deleteCacheKeys([
      cacheKeys.productById(id),
      cacheKeys.productBySlug(deleted.slug),
    ]);
    await bustProductCaches();
    await publishAdminProductEvent({ kind: "deleted", id: deleted.id });
    const actorId = actor ? adminActorNumericId(actor) : null;
    if (actorId != null) {
      void logAdminAction({
        actorUserId: actorId,
        action: "product.soft_delete",
        targetType: "Product",
        targetId: String(deleted.id),
        metadata: { slug: deleted.slug },
      });
    }
  } catch (error: unknown) {
    console.error("[product] delete failed:", error);
    throw error;
  }
}

// search products by query string and fail open to empty list.
export async function searchProductsAction(query: string) {
  // Query-only search path used by lightweight admin/storefront search UIs.
  return runSearchSafely(() => searchProductsService(query));
}

// search products with query/facets and fail open to empty list.
export async function searchProductsWithFiltersAction(
  filters: Parameters<typeof searchProductsWithFiltersService>[0],
) {
  // Filtered search path supports catalog facets/sort in one call.
  return runSearchSafely(() => searchProductsWithFiltersService(filters));
}

export const createProduct = createProductAction;
export const getProductBySlug = getProductBySlugAction;
export const getProductById = getProductByIdAction;
export const getAllProducts = getAllProductsAction;
export const getAllProductsCursor = getAllProductsCursorAction;
export const updateProduct = updateProductAction;
export const deleteProduct = deleteProductAction;
export const searchProducts = searchProductsAction;
export const searchProductsWithFilters = searchProductsWithFiltersAction;
