import { z } from "zod";
import { OrderStatus } from "@prisma/client";

export const updateOrderStatusSchema = z.object({
  orderId: z.number().int().positive(),
  status: z.nativeEnum(OrderStatus),
});

export const updateOrderShipmentSchema = z
  .object({
    orderId: z.number().int().positive(),
    shippingCarrier: z.string().trim().max(80).optional().nullable(),
    trackingNumber: z.string().trim().max(120).optional().nullable(),
    trackingUrl: z.string().trim().url().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasShipmentField =
      Object.prototype.hasOwnProperty.call(data, "shippingCarrier") ||
      Object.prototype.hasOwnProperty.call(data, "trackingNumber") ||
      Object.prototype.hasOwnProperty.call(data, "trackingUrl");

    if (!hasShipmentField) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "At least one shipment field is required (shippingCarrier, trackingNumber, trackingUrl).",
      });
    }
  });
