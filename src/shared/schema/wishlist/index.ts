import { z } from "zod";

export const wishlistMutateSchema = z.object({
  productId: z.number().int().positive(),
});
