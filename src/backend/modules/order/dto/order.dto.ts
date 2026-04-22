import type { OrderStatus } from "@prisma/client";

export type UpdateOrderStatusInput = {
  orderId: number;
  status: OrderStatus;
};

export type UpdateOrderShipmentInput = {
  orderId: number;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
};
