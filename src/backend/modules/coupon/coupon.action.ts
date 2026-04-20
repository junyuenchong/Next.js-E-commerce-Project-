/**
 * coupon action
 * handle coupon action logic
 */
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

// create coupon from admin input.
export async function createCouponAdminAction(
  data: Parameters<typeof createCouponAdminService>[0],
) {
  // keep action layer thin while service owns validation/persistence rules.
  return createCouponAdminService(data);
}

// update existing coupon from admin input.
export async function updateCouponAdminAction(
  id: number,
  data: Prisma.CouponUpdateInput,
) {
  // service enforces business constraints; action forwards typed payload.
  return updateCouponAdminService(id, data);
}

// deactivate coupon so it can no longer be applied.
export async function deactivateCouponAdminAction(id: number) {
  // soft deactivate keeps history while removing active checkout usage.
  return deactivateCouponAdminService(id);
}
