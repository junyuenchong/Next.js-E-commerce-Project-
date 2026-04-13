import prisma from "@/backend/shared/db/prisma";

export async function createUserRepo(email: string, passwordHash: string) {
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

export async function findUserByEmailRepo(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserByIdRepo(id: number) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function updateUserPasswordHashRepo(
  userId: number,
  passwordHash: string,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}
