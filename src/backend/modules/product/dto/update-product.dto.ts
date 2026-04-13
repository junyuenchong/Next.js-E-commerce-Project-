import type { CreateProductDto } from "./create-product.dto";

/** Admin PATCH product: any creatable field plus required id. */
export type UpdateProductDto = Partial<CreateProductDto> & { id: number };
