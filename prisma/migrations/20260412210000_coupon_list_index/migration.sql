-- Align with admin coupon list: ORDER BY isActive DESC, code ASC
DROP INDEX IF EXISTS "Coupon_isActive_idx";
CREATE INDEX "Coupon_isActive_code_idx" ON "Coupon"("isActive", "code");
