import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(4000).trim(),
});

export const updateReviewReplySchema = z.object({
  adminReply: z.string().max(8000).optional(),
});
