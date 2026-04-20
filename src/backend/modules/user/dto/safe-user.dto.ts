/**
 * safe user dto
 * handle safe user dto logic
 */
import type { User } from "@prisma/client";

// frontend-safe user DTO never includes credential fields like `passwordHash`.
export type SafeUserDto = Omit<User, "passwordHash">;

// convert DB user row to frontend-safe DTO.
export function toSafeUserDto(user: User): SafeUserDto {
  const { passwordHash, ...safeUser } = user;
  void passwordHash;
  return safeUser;
}
