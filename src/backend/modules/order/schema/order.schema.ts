import { z } from "zod";
import { OrderStatus } from "@prisma/client";

/** Admin PATCH order status (matches admin orders API). */
export const updateOrderStatusSchema = z.object({
  orderId: z.number().int().positive(),
  status: z.nativeEnum(OrderStatus),
});
