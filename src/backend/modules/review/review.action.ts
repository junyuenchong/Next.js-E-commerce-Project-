/**
 * review action
 * handle review action logic
 */
// provides product review actions for listing, moderation, and seller responses.
"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/modules/auth";
import {
  listProductReviewsService,
  updateAdminReplyService,
  upsertProductReviewService,
} from "./review.service";

async function currentUserId() {
  const s = await getServerSession(authOptions);
  // route-level auth relies on numeric user IDs for review ownership.
  const id = s?.user?.id != null ? Number.parseInt(String(s.user.id), 10) : NaN;
  return Number.isFinite(id) ? id : null;
}

// list active product reviews for storefront display.
export async function listProductReviewsAction(productId: number) {
  // public list path used by product detail pages.
  return listProductReviewsService(productId);
}

// create or update current user's product review.
export async function createOrUpdateProductReviewAction(params: {
  productId: number;
  rating: number;
  comment: string;
}) {
  // review writes require authenticated numeric user id from session.
  const userId = await currentUserId();
  if (!userId) throw new Error("Unauthorized");

  return upsertProductReviewService({
    productId: params.productId,
    userId,
    rating: params.rating,
    comment: params.comment,
  });
}

// update admin reply for a product review.
export async function replyProductReviewAction(
  reviewId: number,
  adminReply: string,
) {
  // admin reply path is separate to preserve original customer content.
  return updateAdminReplyService(reviewId, adminReply);
}

export const createOrUpdateProductReview = createOrUpdateProductReviewAction;
export const replyProductReview = replyProductReviewAction;
