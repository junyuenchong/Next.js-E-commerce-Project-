import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import {
  createUserRepo,
  findUserByEmailRepo,
  findUserByIdRepo,
  updateUserPasswordHashRepo,
} from "./user.repo";
import type { AuthResult } from "./types/user.type";
export type { AuthResult } from "./types/user.type";

export const hashPasswordUserService = async (password: string) => {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(password)));
};

export const verifyPasswordUserService = async (
  password: string,
  hash: string,
) => {
  const passwordHash = await hashPasswordUserService(password);
  return passwordHash === hash;
};

export const registerUserUserService = async (
  email: string,
  password: string,
): Promise<AuthResult> => {
  const passwordHash = await hashPasswordUserService(password);
  try {
    const user = await createUserRepo(email, passwordHash);
    const safeUser = { ...user, passwordHash: undefined };
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
