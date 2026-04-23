// Module: Provides review services for product feedback listing, moderation, and replies.
import {
  findProductById,
  hasUserPurchasedProduct,
  listAllReviewsAdminRepo,
  listProductReviews,
  listProductReviewsForAdmin,
  softDeactivateProductReviewById,
  updateAdminReply,
  upsertProductReview,
} from "./review.repo";

/**
 * List public product reviews for storefront product pages.
 */
export async function listProductReviewsService(productId: number) {
  if (!Number.isFinite(productId)) throw new Error("Invalid product id");
  return listProductReviews(productId);
}

/**
 * List product reviews for admin review UI.
 */
export async function listProductReviewsForAdminService(productId: number) {
  if (!Number.isFinite(productId)) throw new Error("Invalid product id");
  return listProductReviewsForAdmin(productId);
}

/**
 * List all reviews for admin moderation (paginated + searchable).
 */
export async function listAllReviewsAdminService(params: {
  skip: number;
  take: number;
  productId?: number;
  q?: string;
}) {
  return listAllReviewsAdminRepo(params);
}

/**
 * Upsert a product review for a given user and product.
 */
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
  const purchased = await hasUserPurchasedProduct(
    params.userId,
    params.productId,
  );
  if (!purchased) {
    throw new Error("Please purchase this product before submitting a review");
  }

  return upsertProductReview({
    productId: params.productId,
    userId: params.userId,
    rating: params.rating,
    comment: params.comment.trim(),
  });
}

/**
 * Update admin reply for a review.
 */
export async function updateAdminReplyService(
  reviewId: number,
  adminReply: string,
) {
  if (!Number.isFinite(reviewId)) throw new Error("Invalid review id");
  if (!adminReply.trim()) throw new Error("Reply is required");
  return updateAdminReply(reviewId, adminReply.trim());
}

/**
 * Delete (soft-deactivate) a product review (admin).
 */
export async function deleteProductReviewAdminService(reviewId: number) {
  if (!Number.isFinite(reviewId)) throw new Error("Invalid review id");
  return softDeactivateProductReviewById(reviewId);
}
