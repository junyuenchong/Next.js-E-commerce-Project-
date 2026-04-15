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

export async function createCouponAdminAction(
  data: Parameters<typeof createCouponAdminService>[0],
) {
  return createCouponAdminService(data);
}

export async function updateCouponAdminAction(
  id: number,
  data: Prisma.CouponUpdateInput,
) {
  return updateCouponAdminService(id, data);
}

export async function deactivateCouponAdminAction(id: number) {
  return deactivateCouponAdminService(id);
}
