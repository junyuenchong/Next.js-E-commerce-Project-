import { z } from "zod";

export const productSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  categoryId: z.number().int().positive(),
});

export const productSlugSchema = z.object({
  slug: z.string().min(1),
});
