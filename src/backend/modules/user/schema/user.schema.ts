import { z } from "zod";

/** Credential registration (sign-up). */
export const createUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

/** Authenticated password change. */
export const updateUserPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});
