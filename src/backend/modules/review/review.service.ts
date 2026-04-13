import {
  findProductById,
  listAllReviewsAdminRepo,
  listProductReviews,
  listProductReviewsForAdmin,
  softDeactivateProductReviewById,
  updateAdminReply,
  upsertProductReview,
} from "./review.repo";

export async function listProductReviewsService(productId: number) {
  if (!Number.isFinite(productId)) throw new Error("Invalid product id");
  return listProductReviews(productId);
}

export async function listProductReviewsForAdminService(productId: number) {
  if (!Number.isFinite(productId)) throw new Error("Invalid product id");
  return listProductReviewsForAdmin(productId);
}

export async function listAllReviewsAdminService(params: {
  skip: number;
  take: number;
  productId?: number;
  q?: string;
}) {
  return listAllReviewsAdminRepo(params);
}

export async function upsertProductReviewService(params: {
  productId: number;
  userId: number;
  rating: number;
  comment: string;
}) {
  if (!Number.isFinite(params.productId)) throw new Error("Invalid product id");
  if (!Number.isFinite(params.userId)) throw new Error("Invalid user id");
  if (params.rating < 1 || params.rating > 5)
    throw new Error("Rating must be 1-5");
  if (!params.comment.trim()) throw new Error("Comment is required");

  const product = await findProductById(params.productId);
  if (!product) throw new Error("Product not found");

  return upsertProductReview({
    productId: params.productId,
    userId: params.userId,
    rating: params.rating,
    comment: params.comment.trim(),
  });
}

export async function updateAdminReplyService(
  reviewId: number,
  adminReply: string,
) {
  if (!Number.isFinite(reviewId)) throw new Error("Invalid review id");
  if (!adminReply.trim()) throw new Error("Reply is required");
  return updateAdminReply(reviewId, adminReply.trim());
}

export async function deleteProductReviewAdminService(reviewId: number) {
  if (!Number.isFinite(reviewId)) throw new Error("Invalid review id");
  return softDeactivateProductReviewById(reviewId);
}
