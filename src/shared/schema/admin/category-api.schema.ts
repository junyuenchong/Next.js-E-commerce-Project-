import { z } from "zod";
import { categorySchema } from "@/shared/schema/category";

export const adminCategoryCreateBodySchema = categorySchema.extend({
  name: z.string().min(1).max(200),
});

export const adminCategoryPatchBodySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
});
