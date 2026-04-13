import type { z } from "zod";
import type { productSchema } from "../schema/product.schema";

/** Admin create product body (matches `productSchema`). */
export type CreateProductDto = z.infer<typeof productSchema>;
