"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  deleteCacheKeys,
  deleteCacheKeysByPattern,
  getCachedJson,
  setCachedJson,
} from "@/app/lib/redis";
import { publishAdminProductEvent } from "@/app/lib/admin-events";
import { cacheKeys } from "@/app/lib/redis";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/lib/admin-action-log";
import { requireAdminPermission } from "@/backend/lib/require-admin-permission";
import { getCurrentAdminUser } from "@/backend/lib/session";
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

export async function createProductAction(data: unknown) {
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
  await revalidatePath("/modules/admin/products");
  await revalidateTag("products");
  await deleteCacheKeysByPattern(cacheKeys.productListPattern());
  await deleteCacheKeysByPattern(cacheKeys.productsByCategoryAllPattern());
  await publishAdminProductEvent({ kind: "created", id: product.id });
  return product;
}

export async function getProductBySlugAction(slug: string) {
  const cacheKey = cacheKeys.productBySlug(slug);
  const cached = await getCachedJson<unknown>(cacheKey);
  if (cached) return cached;
  const product = await getProductBySlugService(slug);
  await setCachedJson(cacheKey, product);
  return product;
}

export async function getProductByIdAction(id: string) {
  const productId = Number(id);
  const cacheKey = cacheKeys.productById(productId);
  const cached = await getCachedJson<unknown>(cacheKey as string);
  if (cached) return cached;
  const product = await getProductByIdService(id);
  await setCachedJson(cacheKey as string, product);
  return product;
}

export async function getAllProductsAction(limit?: number, page?: number) {
  const take = limit && limit > 0 ? limit : 20;
  const cacheKey = cacheKeys.productsList(take, page || 1);
  const cached = await getCachedJson<unknown[]>(cacheKey);
  if (cached) return cached;
  const products = await listProductsService(limit, page);
  await setCachedJson(cacheKey, products);
  return products;
}

export async function getAllProductsCursorAction(
  limit?: number,
  cursorId?: number,
) {
  return listProductsCursorService(limit, cursorId);
}

export async function updateProductAction(id: number, data: unknown) {
  await requireAdminPermission("product.update");
  let previousSlug: string | undefined;
  try {
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
  await revalidatePath("/modules/admin/products");
  await revalidateTag("products");
  const keys = [
    cacheKeys.productById(id),
    cacheKeys.productBySlug(product.slug),
  ];
  if (previousSlug && previousSlug !== product.slug) {
    keys.push(cacheKeys.productBySlug(previousSlug));
  }
  await deleteCacheKeys(keys);
  await deleteCacheKeysByPattern(cacheKeys.productListPattern());
  await deleteCacheKeysByPattern(cacheKeys.productsByCategoryAllPattern());
  await publishAdminProductEvent({ kind: "updated", id: product.id });
  return product;
}

export async function deleteProductAction(id: number) {
  await requireAdminPermission("product.delete");
  const actor = await getCurrentAdminUser();
  try {
    const deleted = await deleteProductService(id);
    await revalidatePath("/modules/admin/products");
    await revalidateTag("products");
    await deleteCacheKeys([
      cacheKeys.productById(id),
      cacheKeys.productBySlug(deleted.slug),
    ]);
    await deleteCacheKeysByPattern(cacheKeys.productListPattern());
    await deleteCacheKeysByPattern(cacheKeys.productsByCategoryAllPattern());
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

export async function searchProductsAction(query: string) {
  try {
    return await searchProductsService(query);
  } catch (error: unknown) {
    console.error("[searchProducts] Error:", error);
    return [];
  }
}

export async function searchProductsWithFiltersAction(
  filters: Parameters<typeof searchProductsWithFiltersService>[0],
) {
  try {
    return await searchProductsWithFiltersService(filters);
  } catch (error: unknown) {
    console.error("[searchProductsWithFilters] Error:", error);
    return [];
  }
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
