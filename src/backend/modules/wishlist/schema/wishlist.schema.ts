import { z } from "zod";

/** POST wishlist: add by product id. */
export const wishlistMutateSchema = z.object({
  productId: z.number().int().positive(),
});
