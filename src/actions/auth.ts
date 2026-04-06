"use server";
import {
  createSessionService,
  deleteSessionTokenCookieService,
  generateSessionTokenService,
  getCurrentSessionService,
  hashPasswordService,
  invalidateSessionService,
  loginUserService,
  logoutUserService,
  registerUserService,
  setSessionTokenCookieService,
  validateSessionTokenService,
  verifyPasswordService,
  type SessionValidationResult,
} from "@/modules/auth/auth.service";
import type { Session } from "@prisma/client";

export type { SessionValidationResult };

export async function generateSessionToken(): Promise<string> {
  return generateSessionTokenService();
}

export async function createSession(
  token: string,
  userId: number,
): Promise<Session> {
  return createSessionService(token, userId);
}

export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  return validateSessionTokenService(token);
}

export async function invalidateSession(sessionId: string): Promise<void> {
  return invalidateSessionService(sessionId);
}

export async function setSessionTokenCookie(
  token: string,
  expires: Date,
): Promise<void> {
  return setSessionTokenCookieService(token, expires);
}

export async function deleteSessionTokenCookie(): Promise<void> {
  return deleteSessionTokenCookieService();
}

export const getCurrentSession = getCurrentSessionService;
export const hashPassword = hashPasswordService;
export const verifyPassword = verifyPasswordService;
export const registerUser = registerUserService;
export const loginUser = loginUserService;
export const logoutUser = logoutUserService;
