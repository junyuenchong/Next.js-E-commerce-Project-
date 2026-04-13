import { z } from "zod";

/** Client + `signIn("credentials", …)` payload shape. */
export const signInCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(5),
});

/** Matches backend `createUserSchema` for sign-up server actions. */
export const signUpCredentialsSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export { updateUserPasswordSchema as changePasswordFormSchema } from "@/backend/modules/user/schema/user.schema";
