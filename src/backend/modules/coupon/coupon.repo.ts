// implements coupon repository reads and writes for checkout and admin management.
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
 * Handles find coupon by code repo.
 */
export async function findCouponByCodeRepo(code: string) {
  return prisma.coupon.findUnique({ where: { code } });
}

/**
 * Handles find user coupon assignment repo.
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
 * Handles list active storefront coupons repo.
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
 * Handles list coupons admin repo.
 */
export async function listCouponsAdminRepo() {
  return prisma.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
}

/**
 * Handles create coupon admin repo.
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
 * Handles update coupon admin repo.
 */
export async function updateCouponAdminRepo(
  id: number,
  data: Prisma.CouponUpdateInput,
) {
  return prisma.coupon.update({ where: { id }, data });
}

/**
 * Handles deactivate coupon admin repo.
 */
export async function deactivateCouponAdminRepo(id: number) {
  return prisma.coupon.update({
    where: { id },
    data: { isActive: false },
  });
}
