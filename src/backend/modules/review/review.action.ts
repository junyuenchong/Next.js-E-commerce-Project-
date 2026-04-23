// Product review actions for listing, write, and admin reply flows.
"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/modules/auth";
import { parsePositiveInt } from "@/backend/shared/number";
import {
  listProductReviewsService,
  updateAdminReplyService,
  upsertProductReviewService,
} from "./review.service";

async function currentUserId() {
  const s = await getServerSession(authOptions);
  // route-level auth relies on numeric user IDs for review ownership.
  return parsePositiveInt(s?.user?.id) ?? null;
}

export async function listProductReviewsAction(productId: number) {
  // public list path used by product detail pages.
  return listProductReviewsService(productId);
}

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

export async function replyProductReviewAction(
  reviewId: number,
  adminReply: string,
) {
  // admin reply path is separate to preserve original customer content.
  return updateAdminReplyService(reviewId, adminReply);
}

export const createOrUpdateProductReview = createOrUpdateProductReviewAction;
export const replyProductReview = replyProductReviewAction;
