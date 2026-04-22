// manages user account lifecycle services including lookup, password, and session token flows.
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import {
  createUserRepo,
  findUserByIdRepo,
  updateUserPasswordHashRepo,
} from "./user.repo";
import { toSafeUserDto } from "./dto/safe-user.dto";
import type { AuthResult } from "@/shared/types";
export type { AuthResult } from "@/shared/types";

/**
 * Hash a user password for storage.
 */
export const hashPasswordUserService = async (password: string) => {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(password)));
};

/**
 * Verify a user password against a stored hash.
 */
export const verifyPasswordUserService = async (
  password: string,
  hash: string,
) => {
  const passwordHash = await hashPasswordUserService(password);
  return passwordHash === hash;
};

/**
 * Register a new user and return a safe DTO.
 */
export const registerUserUserService = async (
  email: string,
  password: string,
): Promise<AuthResult> => {
  const passwordHash = await hashPasswordUserService(password);
  try {
    const user = await createUserRepo(email, passwordHash);
    const safeUser = toSafeUserDto(user);
    return { user: safeUser, error: null };
  } catch (error: unknown) {
    console.error("[user] register failed", error);
    return { user: null, error: "Failed to register user" };
  }
};

/**
 * Change a user's password after validating current password.
 */
export async function changePasswordUserService(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await findUserByIdRepo(userId);
  if (!user) return { ok: false, error: "user_not_found" };
  if (!user.passwordHash) {
    return { ok: false, error: "no_password" };
  }
  const passwordValid = await verifyPasswordUserService(
    currentPassword,
    user.passwordHash,
  );
  if (!passwordValid) return { ok: false, error: "invalid_current" };
  if (newPassword.length < 8 || newPassword.length > 128) {
    return { ok: false, error: "invalid_new_password" };
  }
  const newHash = await hashPasswordUserService(newPassword);
  await updateUserPasswordHashRepo(userId, newHash);
  return { ok: true };
}
