import type { z } from "zod";
import type { productSchema } from "@/shared/schema/product";

/** Admin create product body (matches `productSchema`). */
export type CreateProductDto = z.infer<typeof productSchema>;
