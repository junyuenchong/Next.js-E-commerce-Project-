/** Line prepared from cart + live product snapshot (PayPal capture). */
export type PaidOrderLineInput = {
  productId: number;
  quantity: number;
  title: string;
  unitPrice: number;
  imageUrl: string | null;
};

export type CreatePaidOrderInput = {
  userId: number | null;
  emailSnapshot: string | null;
  currency: string;
  total: number;
  paypalOrderId: string;
  paypalCaptureId: string | null;
  lines: PaidOrderLineInput[];
  couponId?: number | null;
  couponCodeSnapshot?: string | null;
  discountAmount?: number;
  shippingLine1?: string | null;
  shippingCity?: string | null;
  shippingPostcode?: string | null;
  shippingCountry?: string | null;
  shippingMethod?: string | null;
};
