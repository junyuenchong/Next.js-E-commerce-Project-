/**
 * update cart line dto
 * handle update cart line dto logic
 */
// cart DTO for PATCH line quantity (cart API).
export type UpdateCartLineDto = {
  lineId: string;
  quantity: number;
};
