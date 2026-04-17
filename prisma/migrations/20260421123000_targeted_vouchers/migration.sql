-- Targeted vouchers (assign coupons to specific users)

-- Coupon redemption scope
CREATE TYPE "CouponRedemptionScope" AS ENUM ('PUBLIC', 'ASSIGNED_USERS');

ALTER TABLE "Coupon"
ADD COLUMN "redemptionScope" "CouponRedemptionScope" NOT NULL DEFAULT 'PUBLIC';

-- User-coupon assignment table
CREATE TABLE "UserCouponAssignment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "UserCouponAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCouponAssignment_userId_couponId_key"
ON "UserCouponAssignment"("userId", "couponId");

CREATE INDEX "UserCouponAssignment_couponId_assignedAt_idx"
ON "UserCouponAssignment"("couponId", "assignedAt");

CREATE INDEX "UserCouponAssignment_userId_assignedAt_idx"
ON "UserCouponAssignment"("userId", "assignedAt");

ALTER TABLE "UserCouponAssignment"
ADD CONSTRAINT "UserCouponAssignment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCouponAssignment"
ADD CONSTRAINT "UserCouponAssignment_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

