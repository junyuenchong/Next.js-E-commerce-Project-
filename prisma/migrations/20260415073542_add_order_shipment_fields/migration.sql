-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shippingCarrier" TEXT,
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "trackingUrl" TEXT;

-- Guarded renames (some DBs already have final names)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AdminRolePermission_mig_roleid_permissionId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "AdminRolePermission" RENAME CONSTRAINT "AdminRolePermission_mig_roleid_permissionId_fkey" TO "AdminRolePermission_permissionId_fkey"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AdminRolePermission_mig_roleid_roleId_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE "AdminRolePermission" RENAME CONSTRAINT "AdminRolePermission_mig_roleid_roleId_fkey" TO "AdminRolePermission_roleId_fkey"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    WHERE c.relkind = 'i'
      AND c.relname = 'AdminRolePermission_mig_roleid_permissionId_idx'
  ) THEN
    EXECUTE 'ALTER INDEX "AdminRolePermission_mig_roleid_permissionId_idx" RENAME TO "AdminRolePermission_permissionId_idx"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    WHERE c.relkind = 'i'
      AND c.relname = 'AdminRolePermission_mig_roleid_roleId_idx'
  ) THEN
    EXECUTE 'ALTER INDEX "AdminRolePermission_mig_roleid_roleId_idx" RENAME TO "AdminRolePermission_roleId_idx"';
  END IF;
END $$;
