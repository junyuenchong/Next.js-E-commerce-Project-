// Feature: Manages user account lifecycle services including lookup, password, and session token flows.
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

export const hashPasswordUserService = async (password: string) => {
  // Note: deterministic hash flow keeps compatibility with existing auth storage.
  return encodeHexLowerCase(sha256(new TextEncoder().encode(password)));
};

export const verifyPasswordUserService = async (
  password: string,
  hash: string,
) => {
  // Guard: verify by re-hashing input and comparing against stored hash.
  const passwordHash = await hashPasswordUserService(password);
  return passwordHash === hash;
};

export const registerUserUserService = async (
  email: string,
  password: string,
): Promise<AuthResult> => {
  // Guard: return safe DTO so password hash never leaks to callers.
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

export async function changePasswordUserService(
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Guard: validate current password before overwriting stored hash.
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
