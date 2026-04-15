import { z } from "zod";

export const productSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    price: z.number().positive(),
    compareAtPrice: z.union([z.number().positive(), z.null()]).optional(),
    stock: z.number().int().min(0),
    imageUrl: z
      .string()
      .url()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    categoryId: z.number().int().positive(),
  })
  .refine(
    (d) =>
      d.compareAtPrice == null ||
      !Number.isFinite(d.compareAtPrice) ||
      d.compareAtPrice >= d.price,
    {
      message: "Compare-at price must be greater than or equal to sale price",
      path: ["compareAtPrice"],
    },
  );

export const productSlugSchema = z.object({
  slug: z.string().min(1),
});
