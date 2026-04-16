// Feature: Provides auth-related persistence for admin sessions and password-reset tokens.
import prisma from "@/backend/core/db/prisma";

// Guard: look up user by email for password-reset eligibility checks.
export async function findUserByEmailForPasswordReset(email: string) {
  return prisma.user.findUnique({ where: { email: email.trim() } });
}

// Feature: clear outstanding password-reset tokens for user.
export async function deletePasswordResetTokensForUser(userId: number) {
  return prisma.passwordResetToken.deleteMany({ where: { userId } });
}

// Feature: persist a new password-reset token row.
export async function createPasswordResetTokenRecord(data: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.passwordResetToken.create({ data });
}

// Feature: fetch password-reset token row with related user.
export async function findPasswordResetTokenWithUser(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

// Guard: atomically apply password reset and invalidate sessions/tokens.
export async function applyPasswordResetTransaction(input: {
  userId: number;
  passwordHash: string;
}) {
  // Guard: transaction keeps password update and token/session invalidation atomic.
  return prisma.$transaction([
    prisma.user.update({
      where: { id: input.userId },
      data: { passwordHash: input.passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: input.userId } }),
    prisma.session.deleteMany({ where: { userId: input.userId } }),
  ]);
}

// Feature: load admin-panel user profile fields for access checks.
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

// Feature: fetch user status/role fields for admin session verification.
export async function findUserForAdminSessionRoute(userId: number) {
  // Note: minimal select keeps admin session check endpoint lightweight.
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

// Feature: fetch credential fields for admin password login verification.
export async function findUserForAdminPasswordLogin(email: string) {
  // Note: login query returns only fields required for credential verification.
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
