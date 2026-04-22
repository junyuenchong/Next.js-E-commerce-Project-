// exposes coupon actions for admin management and storefront voucher retrieval.
import type { Prisma } from "@prisma/client";
import {
  createCouponAdminService,
  deactivateCouponAdminService,
  listCouponsAdminService,
  listStorefrontVouchersPublicService,
  resolveCheckoutCouponPricing,
  updateCouponAdminService,
} from "./coupon.service";

export {
  listStorefrontVouchersPublicService,
  resolveCheckoutCouponPricing,
  listCouponsAdminService,
};

/**
 * Handles create coupon admin action.
 */
export async function createCouponAdminAction(
  data: Parameters<typeof createCouponAdminService>[0],
) {
  // keep action layer thin while service owns validation/persistence rules.
  return createCouponAdminService(data);
}

/**
 * Handles update coupon admin action.
 */
export async function updateCouponAdminAction(
  id: number,
  data: Prisma.CouponUpdateInput,
) {
  // service enforces business constraints; action forwards typed payload.
  return updateCouponAdminService(id, data);
}

/**
 * Handles deactivate coupon admin action.
 */
export async function deactivateCouponAdminAction(id: number) {
  // soft deactivate keeps history while removing active checkout usage.
  return deactivateCouponAdminService(id);
}
