export type CreatePayPalOrderInput = {
  currencyCode: string;
  value: string;
};

export type PayPalCaptureParams = {
  orderId: string;
};
