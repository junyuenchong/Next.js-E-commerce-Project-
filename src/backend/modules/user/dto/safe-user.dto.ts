import type { User } from "@prisma/client";

// frontend-safe user DTO never includes credential fields like `passwordHash`.
export type SafeUserDto = Omit<User, "passwordHash">;

/**
 * Handles to safe user dto.
 */
export function toSafeUserDto(user: User): SafeUserDto {
  const { passwordHash, ...safeUser } = user;
  void passwordHash;
  return safeUser;
}
