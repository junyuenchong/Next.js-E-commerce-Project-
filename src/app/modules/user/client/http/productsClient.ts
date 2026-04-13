import http from "@/app/lib/http";

export function productsListUrl(
  categorySlug: string | undefined,
  limit: number,
  cursor: number | null,
) {
  const cursorPart =
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : "";
  return categorySlug
    ? `/modules/user/api/products?category=${encodeURIComponent(categorySlug)}&limit=${limit}${cursorPart}`
    : `/modules/user/api/products?limit=${limit}${cursorPart}`;
}

export async function fetchProductsByUrl(url: string) {
  return (await http.get(url)).data;
}

export async function fetchProductById(productId: string | number) {
  return (await http.get(`/modules/user/api/products/${productId}`)).data;
}

export async function fetchProductReviews(productId: string | number) {
  return (await http.get(`/modules/user/api/products/${productId}/reviews`))
    .data;
}

export async function postProductReview(
  productId: string | number,
  payload: { rating: number; comment: string },
) {
  return (
    await http.post(`/modules/user/api/products/${productId}/reviews`, payload)
  ).data;
}
