import type { Category } from "@prisma/client";

export type CategoryInput = Pick<Category, "name">;
