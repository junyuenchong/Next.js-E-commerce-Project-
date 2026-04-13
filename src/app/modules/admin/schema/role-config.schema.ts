import { z } from "zod";

export const adminRoleSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "slug must be lowercase letters, digits, underscore; start with a letter",
  );

/** `PATCH` body: update permission ids for a role profile. */
export const adminRolePatchPermissionsSchema = z.object({
  roleId: z.number().int().positive(),
  permissionIds: z.array(z.number().int().positive()),
});

/** `PATCH` body: rename a custom role profile. */
export const adminRolePatchProfileMetaSchema = z.object({
  action: z.literal("profile"),
  roleId: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
});

/** `POST` body: create a permission role profile. */
export const adminRolePostBodySchema = z.object({
  slug: adminRoleSlugSchema,
  name: z.string().trim().min(1).max(120),
});
