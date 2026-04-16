import { z } from "zod";

export const adminUserPatchBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("active"),
    userId: z.number().int().positive(),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("profile"),
    userId: z.number().int().positive(),
    email: z.string().email(),
    name: z.union([z.string().max(120), z.null()]).optional(),
  }),
  z.object({
    action: z.literal("permissionProfile"),
    userId: z.number().int().positive(),
    adminPermissionRoleId: z
      .union([z.number().int().positive(), z.null()])
      .optional(),
  }),
]);

export const adminUserCreateBodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1)
    .max(254)
    .refine(
      (value) => !/\s/.test(value),
      "Email or username cannot contain spaces",
    ),
  password: z.string().min(8).max(128),
  name: z.union([z.string().max(120), z.null()]).optional(),
  isActive: z.boolean().optional(),
});

export const adminUserDeleteBodySchema = z.object({
  userId: z.number().int().positive(),
});
