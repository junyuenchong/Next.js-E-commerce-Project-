/*
  Warnings:

  - A unique constraint covering the columns `[cartId,productId]` on the table `CartLineItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Cart_expiresAt_idx" ON "Cart"("expiresAt");

-- CreateIndex
CREATE INDEX "CartLineItem_cartId_idx" ON "CartLineItem"("cartId");

-- CreateIndex
CREATE INDEX "CartLineItem_productId_idx" ON "CartLineItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CartLineItem_cartId_productId_key" ON "CartLineItem"("cartId", "productId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_isActive_createdAt_idx" ON "Product"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_isActive_createdAt_idx" ON "Product"("categoryId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
