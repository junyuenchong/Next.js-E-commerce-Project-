import { decode, encode } from "next-auth/jwt";
import type { AdminSessionClaims } from "@/shared/types/auth";
export type { AdminSessionClaims } from "@/shared/types/auth";

export const ADMIN_SESSION_COOKIE_NAME = "admin_session_token";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function adminSessionSecret(): string | null {
  return process.env.ADMIN_AUTH_SECRET || process.env.NEXTAUTH_SECRET || null;
}

export async function signAdminSessionToken(
  claims: AdminSessionClaims,
): Promise<string> {
  const secret = adminSessionSecret();
  if (!secret) {
    throw new Error("Missing ADMIN_AUTH_SECRET or NEXTAUTH_SECRET");
  }
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

export async function verifyAdminSessionToken(
  token: string,
): Promise<AdminSessionClaims | null> {
  const secret = adminSessionSecret();
  if (!secret) return null;
  try {
    const payload = await decode({ token, secret });
    if (!payload) return null;
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const role = typeof payload.role === "string" ? payload.role : null;
    const isActive = payload.isActive !== false;
    if (
      !sub ||
      !role ||
      (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "STAFF")
    ) {
      return null;
    }
    return { sub, role, isActive };
  } catch {
    return null;
  }
}
