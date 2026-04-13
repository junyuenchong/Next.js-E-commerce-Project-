-- AdminRolePermission: surrogate PK `id`; (roleId, permissionId) stays unique
ALTER TABLE "AdminRolePermission" ADD COLUMN IF NOT EXISTS "id" SERIAL;

ALTER TABLE "AdminRolePermission" DROP CONSTRAINT IF EXISTS "AdminRolePermission_pkey";
ALTER TABLE "AdminRolePermission" DROP CONSTRAINT IF EXISTS "AdminRolePermission_mig_roleid_pkey";

ALTER TABLE "AdminRolePermission" ADD CONSTRAINT "AdminRolePermission_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX IF NOT EXISTS "AdminRolePermission_roleId_permissionId_key" ON "AdminRolePermission"("roleId", "permissionId");
