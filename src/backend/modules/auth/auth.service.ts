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

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetForEmail(email: string): Promise<{
  rawToken: string;
} | null> {
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

export async function consumePasswordResetToken(
  rawToken: string,
  newPasswordHash: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
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

export function canAccessAdminPanel(role: UserRole): boolean {
  return permissionAppRoleFromUserRole(role) != null;
}

const ADMIN_DASHBOARD = "/modules/admin/dashboard";

export function postAuthRedirectPath(
  role: UserRole | string,
  returnUrl?: string | null,
): string {
  if (String(role) === "SUPER_ADMIN") return ADMIN_DASHBOARD;

  if (canAccessAdminPanel(role as UserRole)) {
    const u = returnUrl?.trim();
    if (u && u.startsWith("/modules/admin") && !u.startsWith("//")) {
      if (u === "/modules/admin" || u === "/modules/admin/") {
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
    u !== "/modules/user";

  if (hasConcreteReturn && u) {
    if (u.startsWith("/modules/admin")) return "/modules/user";
    return u;
  }
  return "/modules/user";
}
