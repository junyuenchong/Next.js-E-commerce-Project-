// Module: Provides coupon repository reads and writes for checkout and admin management.
import type {
  CouponDiscountType,
  CouponRedemptionScope,
  Prisma,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "@/app/lib/prisma";

function toDecimal(n: number): Decimal {
  // normalize to 2 decimals so money fields remain consistent in DB.
  return new Decimal(n.toFixed(2));
}

/**
 * Find a coupon row by code.
 */
export async function findCouponByCodeRepo(code: string) {
  return prisma.coupon.findUnique({ where: { code } });
}

/**
 * Find one user-coupon assignment row.
 */
export async function findUserCouponAssignmentRepo(
  userId: number,
  couponId: number,
) {
  return prisma.userCouponAssignment.findUnique({
    where: { userId_couponId: { userId, couponId } },
    select: { usedAt: true },
  });
}

/**
 * List active coupons visible on storefront.
 */
export async function listActiveStorefrontCouponsRepo() {
  // storefront only shows public coupons explicitly surfaced as vouchers.
  return prisma.coupon.findMany({
    where: {
      isActive: true,
      showOnStorefront: true,
      redemptionScope: "PUBLIC",
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

/**
 * List coupons for admin management pages.
 */
export async function listCouponsAdminRepo() {
  return prisma.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
}

/**
 * Create a coupon from admin input.
 */
export async function createCouponAdminRepo(data: {
  code: string;
  description?: string | null;
  discountType: CouponDiscountType;
  value: number;
  minOrderSubtotal?: number | null;
  maxDiscount?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  usageLimit?: number | null;
  isActive?: boolean;
  redemptionScope?: CouponRedemptionScope;
  showOnStorefront?: boolean;
  voucherHeadline?: string | null;
}) {
  // repository handles decimal conversion and nullable normalization before insert.
  return prisma.coupon.create({
    data: {
      code: data.code,
      description: data.description?.trim() || null,
      discountType: data.discountType,
      value: toDecimal(data.value),
      minOrderSubtotal:
        data.minOrderSubtotal != null ? toDecimal(data.minOrderSubtotal) : null,
      maxDiscount:
        data.maxDiscount != null ? toDecimal(data.maxDiscount) : null,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      usageLimit: data.usageLimit ?? null,
      isActive: data.isActive ?? true,
      redemptionScope: data.redemptionScope ?? "PUBLIC",
      showOnStorefront: data.showOnStorefront ?? false,
      voucherHeadline: data.voucherHeadline?.trim() || null,
    },
  });
}

/**
 * Update an existing coupon from admin input.
 */
export async function updateCouponAdminRepo(
  id: number,
  data: Prisma.CouponUpdateInput,
) {
  return prisma.coupon.update({ where: { id }, data });
}

/**
 * Deactivate a coupon by id.
 */
export async function deactivateCouponAdminRepo(id: number) {
  return prisma.coupon.update({
    where: { id },
    data: { isActive: false },
  });
}
