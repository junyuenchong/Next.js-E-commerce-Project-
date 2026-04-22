import type { z } from "zod";
import { adminCouponCreateBodySchema } from "@/shared/schema";

export type CreateCouponDto = z.infer<typeof adminCouponCreateBodySchema>;
