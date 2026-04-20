/**
 * add cart line dto
 * handle add cart line dto logic
 */
// cart DTO for adding/bumping quantity in active cart.
export type AddCartLineDto = {
  productId: number;
  quantity: number;
};
