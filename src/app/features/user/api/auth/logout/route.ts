import { NextResponse } from "next/server";
import { nextAuthClearableCookieNames } from "@/backend/core/next-auth-cookies";

// Clears auth/cart cookies for explicit user logout requests.
export async function POST() {
  const response = NextResponse.json({ success: true });
  const clear = (name: string) =>
    response.cookies.set(name, "", { path: "/", maxAge: 0 });

  for (const name of nextAuthClearableCookieNames) clear(name);
  clear("guestCartId");
  response.cookies.set("session", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}
