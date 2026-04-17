-- Enforce separation: `UserRole.USER` (storefront) has no RBAC profile.
-- `SUPER_ADMIN` always resolves permissions from the built-in `super_admin` profile in app code;
-- any stale `adminPermissionRoleId` on those rows is ignored but should not remain set.

UPDATE "User"
SET "adminPermissionRoleId" = NULL
WHERE "role" = 'USER' AND "adminPermissionRoleId" IS NOT NULL;

UPDATE "User"
SET "adminPermissionRoleId" = NULL
WHERE "role" = 'SUPER_ADMIN' AND "adminPermissionRoleId" IS NOT NULL;
