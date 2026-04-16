import type { Category } from "@prisma/client";

export type { Category };
export type CategoryInput = Pick<Category, "name">;
