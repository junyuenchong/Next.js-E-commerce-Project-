// handles user persistence for account records, password updates, and lookup helpers.
import prisma from "@/backend/core/db/prisma";

/**
 * Handles create user repo.
 */
export async function createUserRepo(email: string, passwordHash: string) {
  // persist password hash directly; plaintext never reaches repository layer.
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

/**
 * Handles find user by email repo.
 */
export async function findUserByEmailRepo(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Handles find user by id repo.
 */
export async function findUserByIdRepo(id: number) {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Handles update user password hash repo.
 */
export async function updateUserPasswordHashRepo(
  userId: number,
  passwordHash: string,
) {
  // caller must validate token/authorization before invoking password update.
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
