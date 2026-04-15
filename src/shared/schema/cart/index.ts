import { z } from "zod";

export const cartMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    productId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(999).optional(),
  }),
  z.object({
    action: z.literal("remove"),
    productId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("update"),
    productId: z.number().int().positive(),
    quantity: z.number().int().min(0).max(999),
  }),
  z.object({
    action: z.literal("clear"),
  }),
]);
