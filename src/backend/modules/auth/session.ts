import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";
import { authOptions } from "./auth-options";
import { findAdminPanelUserRowById } from "./auth.repo";
import { canAccessAdminPanel } from "@/backend/modules/auth/auth.service";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/backend/modules/auth/admin-session";

export type AdminPanelRole = Exclude<UserRole, "USER">;

/**
 * Handles get server session cached.
 */
export async function getServerSessionCached() {
  // cached session read avoids repeated auth DB work per request/render.
  return getServerSession(authOptions);
}

export type AdminSessionUser = {
  id: string;
  email: string | null | undefined;
  name?: string | null;
  image?: string | null;
  role: AdminPanelRole;
  isActive: boolean;
  adminPermissionRoleId: number | null;
};

const getAdminUserRow = cache(async (userId: number) => {
  return findAdminPanelUserRowById(userId);
});

/**
 * Handles get current user.
 */
export async function getCurrentUser() {
  // returns raw NextAuth user; callers should validate `isActive` as needed.
  const session = await getServerSessionCached();
  return session?.user ?? null;
}

/**
 * Handles resolve user id.
 */
export async function resolveUserId(): Promise<number | null> {
  // used by checkout/user flows that require stable numeric DB ids.
  const session = await getServerSessionCached();
  const user = session?.user;
  if (user && "id" in user && user.id) {
    const isActive = "isActive" in user ? user.isActive !== false : true;
    if (!isActive) return null;
    const id = parseInt(String(user.id), 10);
    if (Number.isFinite(id)) return id;
  }
  return null;
}

/**
 * Handles get current admin user.
 */
export async function getCurrentAdminUser(): Promise<AdminSessionUser | null> {
  // admin auth is cookie/JWT-based to stay independent from NextAuth session flow.
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const token = rawToken ? await verifyAdminSessionToken(rawToken) : null;
  if (!token?.sub) return null;

  const id = Number(token.sub);
  if (!Number.isFinite(id)) return null;

  const row = await getAdminUserRow(id);
  if (!row?.isActive) return null;
  if (!canAccessAdminPanel(row.role)) return null;

  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
    image: row.image,
    role: row.role as AdminPanelRole,
    isActive: row.isActive,
    adminPermissionRoleId: row.adminPermissionRoleId,
  };
}
