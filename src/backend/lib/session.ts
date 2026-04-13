import { cache } from "react";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth/next";
import { cookies, headers } from "next/headers";
import { authOptions } from "@/app/lib/authOptions";
import prisma from "@/app/lib/prisma";
import type { UserRole } from "@prisma/client";
import { canAccessAdminPanel } from "./auth";

/** Panel + RBAC context only: `UserRole.USER` (storefront customer) never appears here. */
export type AdminPanelRole = Exclude<UserRole, "USER">;

/**
 * NextAuth session for RSC / layouts. Not wrapped in React `cache` so Route Handlers are not
 * affected by cross-request memoization quirks; RSC still dedupes naturally per render pass.
 */
export async function getServerSessionCached() {
  return getServerSession(authOptions);
}

export type AdminSessionUser = {
  id: string;
  email: string | null | undefined;
  name?: string | null;
  image?: string | null;
  role: AdminPanelRole;
  isActive: boolean;
  /**
   * RBAC override (`AdminRoleDefinition.id`) for `ADMIN` / `STAFF` only.
   * `SUPER_ADMIN` ignores this in the permission resolver (built-in profile).
   * Storefront `USER` accounts must keep this null (enforced in admin APIs / seed).
   */
  adminPermissionRoleId: number | null;
};

const getAdminUserRow = cache(async (userId: number) => {
  return prisma.user.findUnique({
    where: { id: userId },
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
});

/** NextAuth session user (any role, including storefront USER). */
export async function getCurrentUser() {
  const session = await getServerSessionCached();
  return session?.user ?? null;
}

/** Numeric storefront user id for `/modules/user/api/*` routes. */
export async function resolveUserId(): Promise<number | null> {
  const session = await getServerSessionCached();
  const user = session?.user;
  if (user && "id" in user && user.id) {
    const id = parseInt(String(user.id), 10);
    if (Number.isFinite(id)) return id;
  }
  return null;
}

/**
 * Staff / admin session for `/modules/admin` and admin APIs.
 * Uses JWT + DB row (same strategy as `middleware.ts`) because `getServerSession` can return
 * null in App Router Route Handlers even when the session cookie is present.
 */
export async function getCurrentAdminUser(): Promise<AdminSessionUser | null> {
  const headerList = await headers();
  const cookieStore = await cookies();
  const token = await getToken({
    req: {
      headers: Object.fromEntries(headerList.entries()),
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value]),
      ),
    } as Parameters<typeof getToken>[0]["req"],
    secret: process.env.NEXTAUTH_SECRET,
  });
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
