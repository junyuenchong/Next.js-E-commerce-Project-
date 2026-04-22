// implements user account actions for authentication, password resets, and profile access.
"use server";

import { cookies } from "next/headers";
import { getSiteUrl } from "@/app/lib/site-url";
import {
  hashPasswordUserService,
  registerUserUserService,
  verifyPasswordUserService,
} from "./user.service";
export type { AuthResult } from "@/shared/types";

export const hashPasswordUserAction = hashPasswordUserService;
export const verifyPasswordUserAction = verifyPasswordUserService;
export const registerUserUserAction = registerUserUserService;

export const hashPassword = hashPasswordUserAction;
export const verifyPassword = verifyPasswordUserAction;
export const registerUser = registerUserUserAction;

// admin mutations invoked from admin UI server actions.
async function cookieHeader(): Promise<string> {
  // forward current request cookies so admin API keeps same session context.
  const c = await cookies();
  return c
    .getAll()
    .map((x) => `${x.name}=${x.value}`)
    .join("; ");
}

function adminUsersApiUrl() {
  return `${getSiteUrl()}/features/admin/api/users`;
}

async function patchUsers(body: unknown) {
  // use internal API so server actions and route handlers share one RBAC path.
  const res = await fetch(adminUsersApiUrl(), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: await cookieHeader(),
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: res.ok, error: data.error };
}

/**
 * Handles set user active action.
 */
export async function setUserActiveAction(userId: number, isActive: boolean) {
  // toggle team account active state via shared admin users API.
  const { ok } = await patchUsers({ action: "active", userId, isActive });
  return { ok };
}

/**
 * Handles update user profile admin action.
 */
export async function updateUserProfileAdminAction(
  userId: number,
  email: string,
  name: string,
) {
  // normalize profile fields before forwarding to admin users API.
  return patchUsers({
    action: "profile",
    userId,
    email: email.trim().toLowerCase(),
    name: name.trim() === "" ? null : name.trim(),
  });
}
