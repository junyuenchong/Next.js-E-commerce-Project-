import http from "@/app/utils/http";
import { adminApiPaths } from "./paths";

export async function fetchAdminProductReviews(productId: number) {
  return (await http.get(adminApiPaths.productReviews(productId))).data;
}

export async function patchAdminReviewReply(
  reviewId: number,
  adminReply: string,
) {
  await http.patch(adminApiPaths.reviewReply(reviewId), { adminReply });
}

export async function deleteAdminReview(reviewId: number) {
  await http.delete(adminApiPaths.reviewById(reviewId));
}
