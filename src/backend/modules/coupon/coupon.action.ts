// Feature: Exposes coupon actions for admin management and storefront voucher retrieval.
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

// Feature: create coupon from admin input.
export async function createCouponAdminAction(
  data: Parameters<typeof createCouponAdminService>[0],
) {
  // Feature: keep action layer thin while service owns validation/persistence rules.
  return createCouponAdminService(data);
}

// Feature: update existing coupon from admin input.
export async function updateCouponAdminAction(
  id: number,
  data: Prisma.CouponUpdateInput,
) {
  // Guard: service enforces business constraints; action forwards typed payload.
  return updateCouponAdminService(id, data);
}

// Guard: deactivate coupon so it can no longer be applied.
export async function deactivateCouponAdminAction(id: number) {
  // Note: soft deactivate keeps history while removing active checkout usage.
  return deactivateCouponAdminService(id);
}
