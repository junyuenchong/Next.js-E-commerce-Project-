// Module: Provides auth persistence for admin sessions and password reset tokens.
import prisma from "@/backend/core/db/prisma";

/**
 * Find a user by email for password reset flows.
 */
export async function findUserByEmailForPasswordReset(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim() } });
}

/**
 * Delete all password reset tokens for a user.
 */
export async function deletePasswordResetTokensForUser(userId: number) {
  return prisma.passwordResetToken.deleteMany({ where: { userId } });
}

/**
 * Create a password reset token record.
 */
export async function createPasswordResetTokenRecord(data: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.passwordResetToken.create({ data });
}

/**
 * Find a password reset token and its related user.
 */
export async function findPasswordResetTokenWithUser(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

/**
 * Apply password reset and invalidate existing tokens in one transaction.
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
 * Find admin panel user by id.
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
 * Find user data needed by admin session route.
 */
export async function findUserForAdminSessionRoute(userId: number) {
  // minimal select keeps admin session check endpoint lightweight.
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

/**
 * Find user data needed by admin password login.
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
