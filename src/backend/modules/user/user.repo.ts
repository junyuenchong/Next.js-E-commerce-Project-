// Feature: Handles user persistence for account records, password updates, and lookup helpers.
import prisma from "@/backend/core/db/prisma";

// Feature: create new user record with pre-hashed password.
export async function createUserRepo(email: string, passwordHash: string) {
  // Guard: persist password hash directly; plaintext never reaches repository layer.
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

// Feature: find user record by email.
export async function findUserByEmailRepo(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

// Feature: find user record by id.
export async function findUserByIdRepo(id: number) {
  return prisma.user.findUnique({
    where: { id },
  });
}

// Feature: update stored password hash for user.
export async function updateUserPasswordHashRepo(
  userId: number,
  passwordHash: string,
) {
  // Guard: caller must validate token/authorization before invoking password update.
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
