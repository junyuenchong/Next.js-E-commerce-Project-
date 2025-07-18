import { NextResponse } from "next/server";
import { logoutUser } from "@/actions/auth";

export async function POST() {
  // Custom credentials logout
  await logoutUser();

  // Prepare response to clear NextAuth session cookies
  const response = NextResponse.json({ success: true });
  // Remove NextAuth session cookies (for both default and legacy names)
  response.cookies.set("next-auth.session-token", "", { path: "/", maxAge: 0 });
  response.cookies.set("__Secure-next-auth.session-token", "", { path: "/", maxAge: 0 });
  response.cookies.set("next-auth.callback-url", "", { path: "/", maxAge: 0 });
  response.cookies.set("guestCartId", "", { path: "/", maxAge: 0 });
  // Remove custom session cookie
  response.cookies.set("session", "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
  return response;
}   