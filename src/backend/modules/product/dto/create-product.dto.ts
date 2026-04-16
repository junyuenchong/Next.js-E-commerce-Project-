import type { z } from "zod";
import type { productSchema } from "@/shared/schema";

// Feature: admin create product DTO (matches `productSchema`).
export type CreateProductDto = z.infer<typeof productSchema>;
