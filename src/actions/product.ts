"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getCachedJson, setCachedJson, deleteCacheKeys } from "@/lib/redis";
import { publishBusinessEvent } from "@/lib/rabbitmq";
import { publishAdminProductEvent } from "@/lib/admin-events";
import { cacheKeys } from "@/lib/cache-keys";
import {
  createProductService,
  deleteProductService,
  getProductByIdService,
  getProductBySlugService,
  listProductsService,
  searchProductsService,
  updateProductService,
} from "@/modules/product/product.service";

/* ----------------------
 CREATE PRODUCT
------------------------- */
export async function createProduct(data: unknown) {
  const product = await createProductService(data);

  revalidatePath("/admin/products");
  revalidateTag("products");

  // Invalidate product-related caches
  await deleteCacheKeys(["products:all:20:1"]);

  // Publish business event (fire-and-forget)
  await publishBusinessEvent("product.created", {
    id: product.id,
    categoryId: product.categoryId,
    price: product.price,
  });

  await publishAdminProductEvent({ kind: "created", id: product.id });

  return product;
}

/* ----------------------
 GET PRODUCT BY SLUG
------------------------- */
export async function getProductBySlug(slug: string) {
  const cacheKey = cacheKeys.productBySlug(slug);
  const cached = await getCachedJson<unknown>(cacheKey);
  if (cached) return cached;

  const product = await getProductBySlugService(slug);

  await setCachedJson(cacheKey, product);

  return product;
}

/**
 * Get product by ID
 */
export const getProductById = async (id: string) => {
  const productId = Number(id);
  const cacheKey = cacheKeys.productById(productId);
  const cached = await getCachedJson<unknown>(cacheKey as string);
  if (cached) return cached;

  const product = await getProductByIdService(id);

  await setCachedJson(cacheKey as string, product);

  return product;
};

/* ----------------------
 READ ALL PRODUCTS
------------------------- */
export async function getAllProducts(limit?: number, page?: number) {
  const take = limit && limit > 0 ? limit : 20;

  const cacheKey = cacheKeys.productsList(take, page || 1);
  const cached = await getCachedJson<unknown[]>(cacheKey);
  if (cached) return cached;

  const products = await listProductsService(limit, page);

  await setCachedJson(cacheKey, products);

  return products;
}

/* ----------------------
 UPDATE PRODUCT
------------------------- */
export async function updateProduct(id: number, data: unknown) {
  const product = await updateProductService(id, data);

  revalidatePath("/admin/products");
  revalidateTag("products");

  await deleteCacheKeys([
    cacheKeys.productById(id),
    cacheKeys.productBySlug(product.slug),
    cacheKeys.productsList(20, 1),
  ]);

  await publishBusinessEvent("product.updated", {
    id: product.id,
    categoryId: product.categoryId,
    price: product.price,
  });

  await publishAdminProductEvent({ kind: "updated", id: product.id });

  return product;
}

/* ----------------------
 DELETE PRODUCT
------------------------- */
export async function deleteProduct(id: number) {
  try {
    const deleted = await deleteProductService(id);
    revalidatePath("/admin/products");
    revalidateTag("products");

    await deleteCacheKeys([
      `product:id:${id}`,
      `product:slug:${deleted.slug}`,
      "products:list:20:1",
    ]);

    await publishBusinessEvent("product.deleted", {
      id: deleted.id,
      categoryId: deleted.categoryId,
    });

    await publishAdminProductEvent({ kind: "deleted", id: deleted.id });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    throw error;
  }
}

/* ----------------------
 SEARCH PRODUCTS
------------------------- */
export async function searchProducts(query: string) {
  try {
    return await searchProductsService(query);
  } catch (error) {
    console.error("[searchProducts] Error:", error);
    // Return empty array on error instead of throwing
    return [];
  }
}
