import prisma from "@/backend/core/db/prisma";

export async function findUserByEmailForPasswordReset(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim() } });
}

export async function deletePasswordResetTokensForUser(userId: number) {
  return prisma.passwordResetToken.deleteMany({ where: { userId } });
}

export async function createPasswordResetTokenRecord(data: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.passwordResetToken.create({ data });
}

export async function findPasswordResetTokenWithUser(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

export async function applyPasswordResetTransaction(input: {
  userId: number;
  passwordHash: string;
}) {
  return prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: { passwordHash: input.passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: input.userId } }),
    prisma.session.deleteMany({ where: { userId: input.userId } }),
  ]);
}

export async function findAdminPanelUserRowById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      isActive: true,
      adminPermissionRoleId: true,
    },
  });
}

export async function findUserForAdminSessionRoute(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

export async function findUserForAdminPasswordLogin(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });
}
