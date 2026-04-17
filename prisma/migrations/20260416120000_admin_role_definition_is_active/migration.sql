-- Soft-remove for custom permission profiles (keep row + grants for audit / reactivation).
ALTER TABLE "AdminRoleDefinition" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "AdminRoleDefinition_isActive_idx" ON "AdminRoleDefinition"("isActive");
