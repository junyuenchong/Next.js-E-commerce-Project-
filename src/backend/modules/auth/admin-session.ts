import { decode, encode } from "next-auth/jwt";
import type { AdminSessionClaims } from "@/shared/types";
export type { AdminSessionClaims } from "@/shared/types";

// name of admin session cookie.
export const ADMIN_SESSION_COOKIE_NAME = "admin_session_token";
// admin session lifetime (30 days, in seconds).
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// resolve secret used for admin session sign/verify.
function adminSessionSecret(): string | null {
  return process.env.ADMIN_AUTH_SECRET || process.env.NEXTAUTH_SECRET || null;
}

/**
 * Handles sign admin session token.
 */
export async function signAdminSessionToken(
  claims: AdminSessionClaims,
): Promise<string> {
  const secret = adminSessionSecret();
  if (!secret) {
    throw new Error("Missing ADMIN_AUTH_SECRET or NEXTAUTH_SECRET");
  }
  // sign token with role/isActive claims and configured max age.
  return encode({
    secret,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    token: {
      sub: claims.sub,
      role: claims.role,
      isActive: claims.isActive,
    },
  });
}

/**
 * Handles verify admin session token.
 */
export async function verifyAdminSessionToken(
  token: string,
): Promise<AdminSessionClaims | null> {
  const secret = adminSessionSecret();
  if (!secret) return null;
  try {
    // decode JWT payload using resolved secret.
    const payload = await decode({ token, secret });
    if (!payload) return null;
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const role = typeof payload.role === "string" ? payload.role : null;
    // treat `isActive` as true unless payload explicitly sets false.
    const isActive = payload.isActive !== false;
    // only admin roles are valid for admin session token.
    if (
      !sub ||
      !role ||
      (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "STAFF")
    ) {
      return null;
    }
    return { sub, role, isActive };
  } catch {
    // return null when token is invalid or cannot be decoded.
    return null;
  }
}
