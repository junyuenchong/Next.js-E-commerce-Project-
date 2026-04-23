// Module: Provides user persistence for account records, password updates, and lookup helpers.
import prisma from "@/backend/core/db/prisma";

/**
 * Create a user row.
 */
export async function createUserRepo(email: string, passwordHash: string) {
  // persist password hash directly; plaintext never reaches repository layer.
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

/**
 * Find one user by email.
 */
export async function findUserByEmailRepo(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Find one user by numeric id.
 */
export async function findUserByIdRepo(id: number) {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Update the stored password hash for a user.
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
