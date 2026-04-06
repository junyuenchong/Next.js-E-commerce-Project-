-- CreateIndex
CREATE INDEX "Product_categoryId_id_idx" ON "Product"("categoryId", "id");

-- CreateIndex
CREATE INDEX "Product_categoryId_isActive_id_idx" ON "Product"("categoryId", "isActive", "id");
