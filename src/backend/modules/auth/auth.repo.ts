// provides auth-related persistence for admin sessions and password-reset tokens.
import prisma from "@/backend/core/db/prisma";

/**
 * Handles find user by email for password reset.
 */
export async function findUserByEmailForPasswordReset(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim() } });
}

/**
 * Handles delete password reset tokens for user.
 */
export async function deletePasswordResetTokensForUser(userId: number) {
  return prisma.passwordResetToken.deleteMany({ where: { userId } });
}

/**
 * Handles create password reset token record.
 */
export async function createPasswordResetTokenRecord(data: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.passwordResetToken.create({ data });
}

/**
 * Handles find password reset token with user.
 */
export async function findPasswordResetTokenWithUser(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

/**
 * Handles apply password reset transaction.
 */
export async function applyPasswordResetTransaction(input: {
  userId: number;
  passwordHash: string;
}) {
  // transaction keeps password update and token/session invalidation atomic.
  return prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: { passwordHash: input.passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: input.userId } }),
    prisma.session.deleteMany({ where: { userId: input.userId } }),
  ]);
}

/**
 * Handles find admin panel user row by id.
 */
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

/**
 * Handles find user for admin session route.
 */
export async function findUserForAdminSessionRoute(userId: number) {
  // minimal select keeps admin session check endpoint lightweight.
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

/**
 * Handles find user for admin password login.
 */
export async function findUserForAdminPasswordLogin(email: string) {
  // login query returns only fields required for credential verification.
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
