"use server";

import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { getSiteUrl } from "@/app/lib/site-url";
import {
  hashPasswordUserService,
  registerUserUserService,
  verifyPasswordUserService,
} from "./user.service";
export type { AuthResult } from "@/shared/types/user";

export const hashPasswordUserAction = hashPasswordUserService;
export const verifyPasswordUserAction = verifyPasswordUserService;
export const registerUserUserAction = registerUserUserService;

export const hashPassword = hashPasswordUserAction;
export const verifyPassword = verifyPasswordUserAction;
export const registerUser = registerUserUserAction;

// --- Admin mutations (invoked from admin UI server actions) ---
async function cookieHeader(): Promise<string> {
  const c = await cookies();
  return c
    .getAll()
    .map((x) => `${x.name}=${x.value}`)
    .join("; ");
}

async function patchUsers(body: unknown) {
  const res = await fetch(`${getSiteUrl()}/modules/admin/api/users`, {
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

export async function setUserActiveAction(userId: number, isActive: boolean) {
  const { ok } = await patchUsers({ action: "active", userId, isActive });
  return { ok };
}

export async function setUserRoleAction(userId: number, role: UserRole) {
  const { ok } = await patchUsers({ action: "role", userId, role });
  return { ok };
}

export async function updateUserProfileAdminAction(
  userId: number,
  email: string,
  name: string,
) {
  return patchUsers({
    action: "profile",
    userId,
    email: email.trim().toLowerCase(),
    name: name.trim() === "" ? null : name.trim(),
  });
}
