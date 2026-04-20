/**
 * update category dto
 * handle update category dto logic
 */
// category DTO for admin PATCH `/categories` body.
export type UpdateCategoryDto = {
  id: number;
  name: string;
};
