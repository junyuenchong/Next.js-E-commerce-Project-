/** Add or bump quantity for a product in the active cart. */
export type AddCartLineDto = {
  productId: number;
  quantity: number;
};
