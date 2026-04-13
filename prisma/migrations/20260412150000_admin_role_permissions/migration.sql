-- CreateTable
CREATE TABLE "AdminRoleDefinition" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdminRoleDefinition_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "AdminRolePermission" (
    "roleSlug" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,

    CONSTRAINT "AdminRolePermission_pkey" PRIMARY KEY ("roleSlug","permissionKey")
);

-- CreateIndex
CREATE INDEX "AdminRolePermission_roleSlug_idx" ON "AdminRolePermission"("roleSlug");

-- AddForeignKey
ALTER TABLE "AdminRolePermission" ADD CONSTRAINT "AdminRolePermission_roleSlug_fkey" FOREIGN KEY ("roleSlug") REFERENCES "AdminRoleDefinition"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "adminPermissionRoleSlug" TEXT;

-- CreateIndex
CREATE INDEX "User_adminPermissionRoleSlug_idx" ON "User"("adminPermissionRoleSlug");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_adminPermissionRoleSlug_fkey" FOREIGN KEY ("adminPermissionRoleSlug") REFERENCES "AdminRoleDefinition"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed built-in roles (matches former src/backend/lib/permissions.ts defaults)
INSERT INTO "AdminRoleDefinition" ("slug", "name", "isSystem", "sortOrder") VALUES
  ('super_admin', 'Super admin', true, 0),
  ('admin', 'Admin', true, 1),
  ('staff', 'Staff', true, 2);

INSERT INTO "AdminRolePermission" ("roleSlug", "permissionKey") VALUES
  ('super_admin', '*');

INSERT INTO "AdminRolePermission" ("roleSlug", "permissionKey") VALUES
  ('admin', 'user.read'),
  ('admin', 'user.update'),
  ('admin', 'user.ban'),
  ('admin', 'order.read'),
  ('admin', 'order.update'),
  ('admin', 'order.refund'),
  ('admin', 'product.create'),
  ('admin', 'product.update'),
  ('admin', 'product.delete');

INSERT INTO "AdminRolePermission" ("roleSlug", "permissionKey") VALUES
  ('staff', 'user.read'),
  ('staff', 'order.read');
