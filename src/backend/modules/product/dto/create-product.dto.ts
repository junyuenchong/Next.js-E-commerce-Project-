/**
 * create product dto
 * handle create product dto logic
 */
import type { z } from "zod";
import type { productSchema } from "@/shared/schema";

// admin create product DTO (matches `productSchema`).
export type CreateProductDto = z.infer<typeof productSchema>;
