import { z } from "zod";

export const adminPermissionRequirementSchema = z.object({
  permission: z.string().min(1),
});

export const adminAnyPermissionRequirementSchema = z.object({
  permissions: z.array(z.string().min(1)).min(1),
});
