import type { OrderStatus } from "@prisma/client";

/** Admin PATCH order status. */
export type UpdateOrderStatusDto = {
  orderId: number;
  status: OrderStatus;
};
