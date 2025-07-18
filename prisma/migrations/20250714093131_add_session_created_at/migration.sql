/*
  Warnings:

  - You are about to drop the column `shipping` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `tax` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `CartLineItem` table. All the data in the column will be lost.
  - Added the required column `totalPrice` to the `CartLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `CartLineItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Cart_expiresAt_idx";

-- DropIndex
DROP INDEX "Cart_status_idx";

-- DropIndex
DROP INDEX "Cart_userId_idx";

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "shipping",
DROP COLUMN "tax",
DROP COLUMN "total",
ADD COLUMN     "appliedCoupon" TEXT,
ADD COLUMN     "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "itemCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "expiresAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CartLineItem" DROP COLUMN "createdAt",
DROP COLUMN "image",
DROP COLUMN "price",
DROP COLUMN "subtotal",
DROP COLUMN "title",
ADD COLUMN     "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "unitPrice" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Cart_status_expiresAt_idx" ON "Cart"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Cart_userId_status_idx" ON "Cart"("userId", "status");

-- CreateIndex
CREATE INDEX "CartLineItem_cartId_idx" ON "CartLineItem"("cartId");
