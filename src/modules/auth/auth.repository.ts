import prisma from "@/lib/prisma";
import type { Session } from "@prisma/client";

export async function createSessionRecord(session: Omit<Session, "user">) {
  return prisma.session.create({ data: session });
}

export async function findSessionWithUserById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });
}

export async function updateSessionExpiry(sessionId: string, expires: Date) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { expires },
  });
}

export async function deleteSessionById(sessionId: string) {
  return prisma.session.delete({ where: { id: sessionId } });
}

export async function createUserRecord(email: string, passwordHash: string) {
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}
