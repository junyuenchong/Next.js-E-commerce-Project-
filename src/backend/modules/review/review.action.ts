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
  const id = s?.user?.id != null ? Number.parseInt(String(s.user.id), 10) : NaN;
  return Number.isFinite(id) ? id : null;
}

export async function listProductReviewsAction(productId: number) {
  return listProductReviewsService(productId);
}

export async function createOrUpdateProductReviewAction(params: {
  productId: number;
  rating: number;
  comment: string;
}) {
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
  return updateAdminReplyService(reviewId, adminReply);
}

export const createOrUpdateProductReview = createOrUpdateProductReviewAction;
export const replyProductReview = replyProductReviewAction;
