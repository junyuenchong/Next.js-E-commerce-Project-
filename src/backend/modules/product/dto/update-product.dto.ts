import type { CreateProductDto } from "./create-product.dto";

// admin PATCH product DTO (partial create fields + required id).
export type UpdateProductDto = Partial<CreateProductDto> & { id: number };
