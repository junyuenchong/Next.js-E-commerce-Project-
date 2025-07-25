import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1),
});

export const categorySlugSchema = z.object({
  slug: z.string().min(1),
}); 