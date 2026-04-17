-- Amazon-style promoted vouchers on cart/checkout
ALTER TABLE "Coupon" ADD COLUMN "showOnStorefront" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Coupon" ADD COLUMN "voucherHeadline" VARCHAR(160);

CREATE INDEX "Coupon_showOnStorefront_isActive_idx" ON "Coupon"("showOnStorefront", "isActive");
