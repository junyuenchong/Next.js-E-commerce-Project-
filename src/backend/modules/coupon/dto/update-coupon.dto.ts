import type { z } from "zod";
import { adminCouponPatchBodySchema } from "@/shared/schema/coupon";

export type UpdateCouponDto = z.infer<typeof adminCouponPatchBodySchema>;
