import { z } from "zod";

/** Storefront create / upsert review. */
export const createReviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(4000).trim(),
});

/** Admin staff reply on a review (omit or empty clears). */
export const updateReviewReplySchema = z.object({
  adminReply: z.string().max(8000).optional(),
});
