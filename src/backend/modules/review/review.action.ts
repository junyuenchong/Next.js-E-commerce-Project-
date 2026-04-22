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

/**
 * Handles list product reviews action.
 */
export async function listProductReviewsAction(productId: number) {
  // public list path used by product detail pages.
  return listProductReviewsService(productId);
}

/**
 * Handles create or update product review action.
 */
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

/**
 * Handles reply product review action.
 */
export async function replyProductReviewAction(
  reviewId: number,
  adminReply: string,
) {
  // admin reply path is separate to preserve original customer content.
  return updateAdminReplyService(reviewId, adminReply);
}

export const createOrUpdateProductReview = createOrUpdateProductReviewAction;
export const replyProductReview = replyProductReviewAction;
