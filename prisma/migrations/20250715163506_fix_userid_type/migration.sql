/*
  Warnings:

  - You are about to drop the column `appliedCoupon` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `discountAmount` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `discountPercentage` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `itemCount` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `lastActivityAt` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `taxAmount` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the column `addedAt` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `isAvailable` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CartLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `Session` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[sessionToken]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expires` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionToken` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropIndex
DROP INDEX "Cart_status_expiresAt_idx";

-- DropIndex
DROP INDEX "Cart_userId_status_idx";

-- DropIndex
DROP INDEX "CartLineItem_cartId_idx";

-- DropIndex
DROP INDEX "CartLineItem_cartId_productId_key";

-- DropIndex
DROP INDEX "CartLineItem_productId_idx";

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "appliedCoupon",
DROP COLUMN "createdAt",
DROP COLUMN "discountAmount",
DROP COLUMN "discountPercentage",
DROP COLUMN "itemCount",
DROP COLUMN "lastActivityAt",
DROP COLUMN "status",
DROP COLUMN "subtotal",
DROP COLUMN "taxAmount",
DROP COLUMN "totalAmount",
DROP COLUMN "updatedAt",
ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "CartLineItem" DROP COLUMN "addedAt",
DROP COLUMN "isAvailable",
DROP COLUMN "notes",
DROP COLUMN "totalPrice",
DROP COLUMN "unitPrice",
DROP COLUMN "updatedAt",
ADD COLUMN     "image" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "quantity" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "createdAt",
DROP COLUMN "expiresAt",
ADD COLUMN     "expires" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sessionToken" TEXT NOT NULL,
ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "image" TEXT,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- DropEnum
DROP TYPE "CartStatus";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
