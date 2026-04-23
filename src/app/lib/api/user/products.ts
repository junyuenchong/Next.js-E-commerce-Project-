import { http } from "@/app/lib/network";

export function productsListUrl(
  categorySlug: string | undefined,
  limit: number,
  cursor: number | null,
) {
  const cursorPart =
    cursor != null ? `&cursor=${encodeURIComponent(String(cursor))}` : "";
  return categorySlug
    ? `/features/user/api/products?category=${encodeURIComponent(categorySlug)}&limit=${limit}${cursorPart}`
    : `/features/user/api/products?limit=${limit}${cursorPart}`;
}

export async function fetchProductsByUrl(url: string) {
  return (await http.get(url)).data;
}

export async function fetchProductById(productId: string | number) {
  return (await http.get(`/features/user/api/products/${productId}`)).data;
}

export async function fetchProductReviews(productId: string | number) {
  return (await http.get(`/features/user/api/products/${productId}/reviews`))
    .data;
}

export async function fetchProductReviewEligibility(
  productId: string | number,
) {
  return (
    await http.get(
      `/features/user/api/products/${productId}/reviews/eligibility`,
    )
  ).data;
}

export async function postProductReview(
  productId: string | number,
  payload: { rating: number; comment: string },
) {
  return (
    await http.post(`/features/user/api/products/${productId}/reviews`, payload)
  ).data;
}
