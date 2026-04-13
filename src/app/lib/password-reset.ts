import { createHash, randomBytes } from "crypto";
import prisma from "@/app/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetForEmail(email: string): Promise<{
  rawToken: string;
} | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!user?.passwordHash) return null;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + HOUR_MS),
    },
  });
  return { rawToken };
}

export async function consumePasswordResetToken(
  rawToken: string,
  newPasswordHash: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tokenHash = hashResetToken(rawToken);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "invalid_or_expired" };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
    prisma.session.deleteMany({ where: { userId: row.userId } }),
  ]);

  return { ok: true };
}
