import type { User } from "@prisma/client";

/** User row without secret hash (safe for responses / session projection). */
export type SafeUser = Omit<User, "passwordHash">;

export type AuthResult = {
  user: SafeUser | null;
  error: string | null;
};
