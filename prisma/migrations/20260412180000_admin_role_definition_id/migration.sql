-- Unhook FKs that reference AdminRoleDefinition.slug (required before slug stops being the PK).
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_adminPermissionRoleSlug_fkey";
ALTER TABLE "AdminRolePermission" DROP CONSTRAINT IF EXISTS "AdminRolePermission_new_roleSlug_fkey";
ALTER TABLE "AdminRolePermission" DROP CONSTRAINT IF EXISTS "AdminRolePermission_roleSlug_fkey";

-- AdminRoleDefinition: integer PK; slug stays unique (human-readable code)
ALTER TABLE "AdminRoleDefinition" ADD COLUMN IF NOT EXISTS "id" SERIAL NOT NULL;

ALTER TABLE "AdminRoleDefinition" DROP CONSTRAINT "AdminRoleDefinition_pkey";
ALTER TABLE "AdminRoleDefinition" ADD CONSTRAINT "AdminRoleDefinition_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminRoleDefinition_slug_key" ON "AdminRoleDefinition"("slug");

-- Rebuild grants: roleSlug -> roleId (unique temp names avoid collisions with failed prior attempts)
DROP TABLE IF EXISTS "AdminRolePermission_mig_roleid" CASCADE;
CREATE TABLE "AdminRolePermission_mig_roleid" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "AdminRolePermission_mig_roleid_pkey" PRIMARY KEY ("roleId","permissionId")
);

CREATE INDEX "AdminRolePermission_mig_roleid_roleId_idx" ON "AdminRolePermission_mig_roleid"("roleId");
CREATE INDEX "AdminRolePermission_mig_roleid_permissionId_idx" ON "AdminRolePermission_mig_roleid"("permissionId");

INSERT INTO "AdminRolePermission_mig_roleid" ("roleId", "permissionId")
SELECT d."id", arp."permissionId"
FROM "AdminRolePermission" arp
INNER JOIN "AdminRoleDefinition" d ON d."slug" = arp."roleSlug";

ALTER TABLE "AdminRolePermission_mig_roleid" ADD CONSTRAINT "AdminRolePermission_mig_roleid_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES "AdminRoleDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminRolePermission_mig_roleid" ADD CONSTRAINT "AdminRolePermission_mig_roleid_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "AdminPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "AdminRolePermission";
ALTER TABLE "AdminRolePermission_mig_roleid" RENAME TO "AdminRolePermission";
  
-- User: optional permission profile by role id
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminPermissionRoleId" INTEGER;

UPDATE "User" u
SET "adminPermissionRoleId" = d."id"
FROM "AdminRoleDefinition" d
WHERE u."adminPermissionRoleSlug" IS NOT NULL AND u."adminPermissionRoleSlug" = d."slug";

DROP INDEX IF EXISTS "User_adminPermissionRoleSlug_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "adminPermissionRoleSlug";

ALTER TABLE "User" ADD CONSTRAINT "User_adminPermissionRoleId_fkey"
  FOREIGN KEY ("adminPermissionRoleId") REFERENCES "AdminRoleDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "User_adminPermissionRoleId_idx" ON "User"("adminPermissionRoleId");
