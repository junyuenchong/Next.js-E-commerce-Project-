import type { User } from "@prisma/client";

// Guard: frontend-safe user DTO never includes credential fields like `passwordHash`.
export type SafeUserDto = Omit<User, "passwordHash">;

// Feature: convert DB user row to frontend-safe DTO.
export function toSafeUserDto(user: User): SafeUserDto {
  const { passwordHash, ...safeUser } = user;
  void passwordHash;
  return safeUser;
}
