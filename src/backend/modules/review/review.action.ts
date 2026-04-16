// Feature: Provides product review actions for listing, moderation, and seller responses.
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
  // Guard: route-level auth relies on numeric user IDs for review ownership.
  const id = s?.user?.id != null ? Number.parseInt(String(s.user.id), 10) : NaN;
  return Number.isFinite(id) ? id : null;
}

// Feature: list active product reviews for storefront display.
export async function listProductReviewsAction(productId: number) {
  // Note: public list path used by product detail pages.
  return listProductReviewsService(productId);
}

// Guard: create or update current user's product review.
export async function createOrUpdateProductReviewAction(params: {
  productId: number;
  rating: number;
  comment: string;
}) {
  // Guard: review writes require authenticated numeric user id from session.
  const userId = await currentUserId();
  if (!userId) throw new Error("Unauthorized");

  return upsertProductReviewService({
    productId: params.productId,
    userId,
    rating: params.rating,
    comment: params.comment,
  });
}

// Feature: update admin reply for a product review.
export async function replyProductReviewAction(
  reviewId: number,
  adminReply: string,
) {
  // Note: admin reply path is separate to preserve original customer content.
  return updateAdminReplyService(reviewId, adminReply);
}

export const createOrUpdateProductReview = createOrUpdateProductReviewAction;
export const replyProductReview = replyProductReviewAction;
