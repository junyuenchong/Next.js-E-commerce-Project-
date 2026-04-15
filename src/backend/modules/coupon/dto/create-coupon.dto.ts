import type { z } from "zod";
import { adminCouponCreateBodySchema } from "@/shared/schema/coupon";

export type CreateCouponDto = z.infer<typeof adminCouponCreateBodySchema>;
