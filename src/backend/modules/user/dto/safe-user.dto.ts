import type { User } from "@prisma/client";

// frontend-safe user DTO never includes credential fields like `passwordHash`.
export type SafeUserDto = Omit<User, "passwordHash">;

/**
 * Strip sensitive fields before returning user data to clients.
 */
export function toSafeUserDto(user: User): SafeUserDto {
  const { passwordHash, ...safeUser } = user;
  void passwordHash;
  return safeUser;
}
