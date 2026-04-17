-- Admin audit trail (refunds, bans, product deactivations, etc.)
CREATE TABLE "AdminActionLog" (
    "id" SERIAL NOT NULL,
    "actorUserId" INTEGER,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminActionLog_actorUserId_createdAt_idx" ON "AdminActionLog"("actorUserId", "createdAt");
CREATE INDEX "AdminActionLog_action_createdAt_idx" ON "AdminActionLog"("action", "createdAt");

ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Money: Float → Decimal(12,2)
ALTER TABLE "Product" ALTER COLUMN "price" TYPE DECIMAL(12,2) USING ROUND(COALESCE("price", 0)::numeric, 2);
ALTER TABLE "Product" ALTER COLUMN "compareAtPrice" TYPE DECIMAL(12,2) USING CASE WHEN "compareAtPrice" IS NULL THEN NULL ELSE ROUND("compareAtPrice"::numeric, 2) END;

ALTER TABLE "Order" ALTER COLUMN "total" TYPE DECIMAL(12,2) USING ROUND(COALESCE("total", 0)::numeric, 2);
ALTER TABLE "OrderLineItem" ALTER COLUMN "unitPrice" TYPE DECIMAL(12,2) USING ROUND(COALESCE("unitPrice", 0)::numeric, 2);
ALTER TABLE "CartLineItem" ALTER COLUMN "price" TYPE DECIMAL(12,2) USING CASE WHEN "price" IS NULL THEN NULL ELSE ROUND("price"::numeric, 2) END;

-- Order: default lifecycle starts at pending (paid set explicitly after capture)
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'pending'::"OrderStatus";

CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
