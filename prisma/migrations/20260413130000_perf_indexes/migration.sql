-- Composite index for address book queries (filter by user, sort default first)
CREATE INDEX IF NOT EXISTS "UserAddress_userId_isDefault_idx" ON "UserAddress"("userId", "isDefault");

-- NextAuth / session hydration: lookup accounts by user
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");

-- Admin order list ordered by createdAt desc
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
