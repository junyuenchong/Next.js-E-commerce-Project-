import { http } from "@/app/lib/network";
import { adminApiPaths } from "./paths";

const PAGE_SIZE = 10;

export function adminProductsListUrl(
  limit: number,
  cursor: number | null,
  q?: string,
): string {
  const cursorPart =
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : "";
  const qPart = q?.trim() ? `&q=${encodeURIComponent(q.trim())}` : "";
  return `${adminApiPaths.products}?limit=${limit}${cursorPart}${qPart}`;
}

export async function fetchAdminProductsByUrl(url: string) {
  return (await http.get(url)).data;
}

/**
 * admin products client
 * warm cache for products page (optional)
 */
export async function prefetchAdminProductsPreview(limit = 20) {
  return fetchAdminProductsByUrl(adminProductsListUrl(limit, null));
}

export { PAGE_SIZE as ADMIN_PRODUCTS_PAGE_SIZE };
