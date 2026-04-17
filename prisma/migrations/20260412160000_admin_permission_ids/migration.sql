-- Catalog of permissions (integer id + stable key for app logic)
CREATE TABLE "AdminPermission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminPermission_key_key" ON "AdminPermission"("key");

INSERT INTO "AdminPermission" ("key", "label", "sortOrder") VALUES
  ('user.read', 'View users', 0),
  ('user.update', 'Edit users (role, profile)', 1),
  ('user.ban', 'Block or activate users', 2),
  ('order.read', 'View orders', 3),
  ('order.update', 'Update orders', 4),
  ('order.refund', 'Refund orders', 5),
  ('product.create', 'Create products', 6),
  ('product.update', 'Edit products & categories', 7),
  ('product.delete', 'Delete products', 8),
  ('*', 'Full access (all permissions)', 100);

-- Replace string keys on role grants with FK to AdminPermission
CREATE TABLE "AdminRolePermission_new" (
    "roleSlug" TEXT NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "AdminRolePermission_new_pkey" PRIMARY KEY ("roleSlug","permissionId")
);

CREATE INDEX "AdminRolePermission_new_roleSlug_idx" ON "AdminRolePermission_new"("roleSlug");
CREATE INDEX "AdminRolePermission_new_permissionId_idx" ON "AdminRolePermission_new"("permissionId");

INSERT INTO "AdminRolePermission_new" ("roleSlug", "permissionId")
SELECT arp."roleSlug", ap."id"
FROM "AdminRolePermission" arp
INNER JOIN "AdminPermission" ap ON ap."key" = arp."permissionKey";

ALTER TABLE "AdminRolePermission_new" ADD CONSTRAINT "AdminRolePermission_new_roleSlug_fkey"
  FOREIGN KEY ("roleSlug") REFERENCES "AdminRoleDefinition"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminRolePermission_new" ADD CONSTRAINT "AdminRolePermission_new_permissionId_fkey"
  FOREIGN KEY ("permissionId") REFERENCES "AdminPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "AdminRolePermission";

ALTER TABLE "AdminRolePermission_new" RENAME TO "AdminRolePermission";
