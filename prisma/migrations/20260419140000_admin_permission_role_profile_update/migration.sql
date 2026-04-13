-- Edit custom permission profiles (matrix + display name) without super admin; create remains super-only in code.
INSERT INTO "AdminPermission" ("key", "label", "sortOrder")
VALUES ('role.profile.update', 'Edit permission profiles', 10)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "AdminRolePermission" ("roleId", "permissionId")
SELECT d.id, ap.id
FROM "AdminRoleDefinition" d
JOIN "AdminPermission" ap ON ap."key" = 'role.profile.update'
WHERE d.slug IN ('admin', 'super_admin')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
