-- Soft-delete flags (rows retained for history / FK safety).

ALTER TABLE "Category" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

ALTER TABLE "UserAddress" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "UserAddress_userId_isActive_idx" ON "UserAddress"("userId", "isActive");

ALTER TABLE "ProductReview" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "ProductReview_productId_isActive_createdAt_idx" ON "ProductReview"("productId", "isActive", "createdAt");

ALTER TABLE "WishlistItem" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "WishlistItem_userId_isActive_idx" ON "WishlistItem"("userId", "isActive");
