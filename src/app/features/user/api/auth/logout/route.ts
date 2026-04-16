import { NextResponse } from "next/server";
import { nextAuthClearableCookieNames } from "@/backend/core/next-auth-cookies";

export async function POST() {
  const res = NextResponse.json({ success: true });
  const clear = (name: string) =>
    res.cookies.set(name, "", { path: "/", maxAge: 0 });

  for (const name of nextAuthClearableCookieNames) clear(name);
  clear("guestCartId");
  res.cookies.set("session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}
