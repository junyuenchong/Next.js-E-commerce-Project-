import { z } from "zod";
import { UserRole } from "@prisma/client";

export const adminUserPatchBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("active"),
    userId: z.number().int().positive(),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("role"),
    userId: z.number().int().positive(),
    role: z.nativeEnum(UserRole),
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
