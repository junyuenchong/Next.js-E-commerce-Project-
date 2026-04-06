import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import type { Session, User } from "@prisma/client";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  createSessionRecord,
  createUserRecord,
  deleteSessionById,
  findSessionWithUserById,
  findUserByEmail,
  updateSessionExpiry,
} from "./auth.repository";
import { mergeGuestCartToUserService } from "@/modules/cart/cart.service";

export type SessionValidationResult =
  | { session: Session; user: Omit<User, "passwordHash"> }
  | { session: null; user: null };

export async function generateSessionTokenService(): Promise<string> {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createSessionService(
  token: string,
  userId: number,
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Omit<Session, "user"> = {
    id: sessionId,
    sessionToken: token,
    userId,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  };
  await createSessionRecord(session);
  return session as Session;
}

export async function validateSessionTokenService(
  token: string,
): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const result = await findSessionWithUserById(sessionId);
  if (result === null) return { session: null, user: null };

  const { user, ...session } = result;
  if (Date.now() >= session.expires.getTime()) {
    await deleteSessionById(sessionId);
    return { session: null, user: null };
  }

  if (Date.now() >= session.expires.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await updateSessionExpiry(session.id, session.expires);
  }

  const safeUser = {
    ...user,
    passwordHash: undefined,
  };

  return { session, user: safeUser };
}

export async function invalidateSessionService(
  sessionId: string,
): Promise<void> {
  await deleteSessionById(sessionId);
}

export async function setSessionTokenCookieService(
  token: string,
  expires: Date,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export async function deleteSessionTokenCookieService(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export const getCurrentSessionService = cache(
  async (): Promise<SessionValidationResult> => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value ?? null;
    if (token === null) return { session: null, user: null };
    return validateSessionTokenService(token);
  },
);

export const hashPasswordService = async (password: string) => {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(password)));
};

export const verifyPasswordService = async (password: string, hash: string) => {
  const passwordHash = await hashPasswordService(password);
  return passwordHash === hash;
};

export const registerUserService = async (email: string, password: string) => {
  const passwordHash = await hashPasswordService(password);
  try {
    const user = await createUserRecord(email, passwordHash);
    const safeUser = { ...user, passwordHash: undefined };
    return { user: safeUser, error: null };
  } catch {
    return { user: null, error: "Failed to register user" };
  }
};

export const loginUserService = async (email: string, password: string) => {
  const user = await findUserByEmail(email);
  if (!user) return { user: null, error: "User not found" };
  if (!user.passwordHash) {
    return {
      user: null,
      error:
        "This account does not have a password. Please sign in with Google or Facebook.",
    };
  }

  const passwordValid = await verifyPasswordService(
    password,
    user.passwordHash,
  );
  if (!passwordValid) return { user: null, error: "Invalid password" };

  const token = await generateSessionTokenService();
  const session = await createSessionService(token, user.id);
  await setSessionTokenCookieService(token, session.expires);

  const cookieStore = await cookies();
  // Merge guest cart on login (service handles “no guest cart” safely).
  if (cookieStore.get("guestCartId")?.value) {
    await mergeGuestCartToUserService();
  }

  const safeUser = { ...user, passwordHash: undefined };
  return { user: safeUser, error: null };
};

export const logoutUserService = async () => {
  const session = await getCurrentSessionService();
  if (session.session?.id) {
    await invalidateSessionService(session.session.id);
  }
  await deleteSessionTokenCookieService();
};
