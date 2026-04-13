-- Allow gating "delete custom permission profile" separately from other role edits.
INSERT INTO "AdminPermission" ("key", "label", "sortOrder")
VALUES ('role.profile.delete', 'Delete permission profiles', 9)
ON CONFLICT ("key") DO NOTHING;
