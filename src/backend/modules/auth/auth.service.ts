// Module: Provides authentication and password reset service logic with role-aware access checks.
import { createHash, randomBytes } from "crypto";
import type { UserRole } from "@prisma/client";
import type { AppPermissionRole } from "@/backend/modules/access-control";
import {
  applyPasswordResetTransaction,
  createPasswordResetTokenRecord,
  deletePasswordResetTokensForUser,
  findPasswordResetTokenWithUser,
  findUserByEmailForPasswordReset,
} from "./auth.repo";

const HOUR_MS = 60 * 60 * 1000;
const INTERNAL_ADMIN_LOGIN_DOMAIN = "admin.local";

/**
 * Hash a password-reset token for storage and lookup.
 */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isEmailLikeIdentifier(value: string): boolean {
  return value.includes("@");
}

/**
 * Normalize admin login identifier (email or username-like input).
 */
export function normalizeAdminLoginIdentifier(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (isEmailLikeIdentifier(value)) return value;
  return `${value}@${INTERNAL_ADMIN_LOGIN_DOMAIN}`;
}

/**
 * Create a password-reset token for a known user email.
 */
export async function createPasswordResetForEmail(email: string): Promise<{
  rawToken: string;
} | null> {
  // only issue reset token for users that own a local password hash.
  const user = await findUserByEmailForPasswordReset(email);
  if (!user?.passwordHash) return null;

  await deletePasswordResetTokensForUser(user.id);

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  await createPasswordResetTokenRecord({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + HOUR_MS),
  });
  return { rawToken };
}

/**
 * Validate and consume a reset token, then update password hash.
 */
export async function consumePasswordResetToken(
  rawToken: string,
  newPasswordHash: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // reject invalid/expired token before password mutation transaction.
  const tokenHash = hashResetToken(rawToken);
  const row = await findPasswordResetTokenWithUser(tokenHash);
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "invalid_or_expired" };
  }

  await applyPasswordResetTransaction({
    userId: row.userId,
    passwordHash: newPasswordHash,
  });

  return { ok: true };
}

/**
 * Map persisted user role to permission app role.
 */
export function permissionAppRoleFromUserRole(
  role: UserRole,
): AppPermissionRole | null {
  switch (role) {
    case "SUPER_ADMIN":
      return "super_admin";
    case "ADMIN":
      return "admin";
    case "STAFF":
      return "staff";
    default:
      return null;
  }
}

/**
 * Return true when a user role can access the admin panel.
 */
export function canAccessAdminPanel(role: UserRole): boolean {
  return permissionAppRoleFromUserRole(role) != null;
}

const ADMIN_DASHBOARD = "/features/admin/dashboard";

/**
 * Compute post-auth redirect path from role and callback input.
 */
export function postAuthRedirectPath(
  role: UserRole | string,
  returnUrl?: string | null,
): string {
  // resolve safe post-login redirect by role and sanitized returnUrl.
  if (String(role) === "SUPER_ADMIN") return ADMIN_DASHBOARD;

  if (canAccessAdminPanel(role as UserRole)) {
    const u = returnUrl?.trim();
    if (u && u.startsWith("/features/admin") && !u.startsWith("//")) {
      if (u === "/features/admin" || u === "/features/admin/") {
        return ADMIN_DASHBOARD;
      }
      return u;
    }
    return ADMIN_DASHBOARD;
  }

  const u = returnUrl?.trim();
  const hasConcreteReturn =
    Boolean(u) &&
    u!.startsWith("/") &&
    !u!.startsWith("//") &&
    u !== "/" &&
    u !== "/features/user";

  if (hasConcreteReturn && u) {
    if (u.startsWith("/features/admin")) return "/features/user";
    return u;
  }
  return "/features/user";
}
