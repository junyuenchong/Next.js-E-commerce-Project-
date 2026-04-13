import { z } from "zod";
import { CouponDiscountType, CouponRedemptionScope } from "@prisma/client";

export const couponDiscountTypeSchema = z.nativeEnum(CouponDiscountType);
export const couponRedemptionScopeSchema = z.nativeEnum(CouponRedemptionScope);

export const adminCouponCreateBodySchema = z.object({
  code: z.string().trim().min(1).max(64),
  description: z.string().trim().max(500).optional().nullable(),
  discountType: couponDiscountTypeSchema,
  value: z.number().positive().max(1_000_000),
  minOrderSubtotal: z.number().min(0).max(1_000_000).optional().nullable(),
  maxDiscount: z.number().min(0).max(1_000_000).optional().nullable(),
  startsAt: z.string().trim().max(40).optional().nullable(),
  endsAt: z.string().trim().max(40).optional().nullable(),
  usageLimit: z.number().int().min(1).max(1_000_000).optional().nullable(),
  isActive: z.boolean().optional(),
  redemptionScope: couponRedemptionScopeSchema.optional(),
  showOnStorefront: z.boolean().optional(),
  voucherHeadline: z.string().trim().max(160).optional().nullable(),
});

export const adminCouponPatchBodySchema = z.object({
  id: z.number().int().positive(),
  description: z.string().trim().max(500).optional().nullable(),
  discountType: couponDiscountTypeSchema.optional(),
  value: z.number().positive().max(1_000_000).optional(),
  minOrderSubtotal: z.number().min(0).max(1_000_000).optional().nullable(),
  maxDiscount: z.number().min(0).max(1_000_000).optional().nullable(),
  startsAt: z.string().trim().max(40).optional().nullable(),
  endsAt: z.string().trim().max(40).optional().nullable(),
  usageLimit: z.number().int().min(1).max(1_000_000).optional().nullable(),
  isActive: z.boolean().optional(),
  redemptionScope: couponRedemptionScopeSchema.optional(),
  showOnStorefront: z.boolean().optional(),
  voucherHeadline: z.string().trim().max(160).optional().nullable(),
});
