/**
 * update coupon dto
 * handle update coupon dto logic
 */
import type { z } from "zod";
import { adminCouponPatchBodySchema } from "@/shared/schema";

export type UpdateCouponDto = z.infer<typeof adminCouponPatchBodySchema>;
