import { z } from "zod";

export const signInCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(5),
});

export const signUpCredentialsSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const createUserSchema = signUpCredentialsSchema;

export const updateUserPasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export const changePasswordFormSchema = updateUserPasswordSchema;
