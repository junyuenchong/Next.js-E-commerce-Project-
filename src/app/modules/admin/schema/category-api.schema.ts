import { z } from "zod";
import { categorySchema } from "@/backend/modules/category/schema/category.schema";

/** `POST /modules/admin/api/categories` JSON body. */
export const adminCategoryCreateBodySchema = categorySchema.extend({
  name: z.string().min(1).max(200),
});

/** `PATCH /modules/admin/api/categories` JSON body. */
export const adminCategoryPatchBodySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
});
