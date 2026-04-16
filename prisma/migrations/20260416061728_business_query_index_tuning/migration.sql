-- CreateIndex
CREATE INDEX "Order_userId_id_idx" ON "Order"("userId", "id");

-- CreateIndex
CREATE INDEX "SupportConversation_lastMessageAt_idx" ON "SupportConversation"("lastMessageAt");
