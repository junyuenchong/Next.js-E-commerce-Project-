import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_BASE = "/modules/admin";

// This middleware blocks unauthenticated users from accessing the admin pages (but not admin APIs).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow non-admin pages through
  if (!pathname.startsWith(ADMIN_BASE)) {
    return NextResponse.next();
  }

  // Allow all admin API calls through
  if (pathname.startsWith(`${ADMIN_BASE}/api/`)) {
    return NextResponse.next();
  }

  // Allow the admin sign-in page through
  if (pathname.startsWith(`${ADMIN_BASE}/auth/sign-in`)) {
    return NextResponse.next();
  }

  // Check if user is logged in
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If not logged in, redirect to admin sign-in page
  if (!token?.sub) {
    const url = request.nextUrl.clone();
    url.pathname = "/modules/admin/auth/sign-in";
    url.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(url);
  }

  // If logged in, continue to admin page
  return NextResponse.next();
}

// Apply middleware to all /modules/admin routes
export const config = {
  matcher: ["/modules/admin/:path*"],
};
