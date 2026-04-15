import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/backend/modules/auth/admin-session";

const ADMIN_BASE = "/modules/admin";
const USER_BASE = "/modules/user";
const PROTECTED_USER_PREFIXES = [
  "/modules/user/cart",
  "/modules/user/checkout",
  "/modules/user/orders",
  "/modules/user/profile",
  "/modules/user/wishlist",
  "/modules/user/support/chat",
];

function isProtectedUserPage(pathname: string): boolean {
  return PROTECTED_USER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

async function handleAdminRouteGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(ADMIN_BASE)) return null;
  if (pathname.startsWith(`${ADMIN_BASE}/api/`)) return null;
  if (pathname.startsWith(`${ADMIN_BASE}/auth/sign-in`)) return null;

  const raw = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const token = raw ? await verifyAdminSessionToken(raw) : null;

  if (!token?.sub) {
    const url = request.nextUrl.clone();
    url.pathname = "/modules/admin/auth/sign-in";
    url.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (token.isActive === false) {
    const url = request.nextUrl.clone();
    url.pathname = "/modules/user";
    return NextResponse.redirect(url);
  }

  return null;
}

async function handleUserRouteGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(USER_BASE)) return null;
  if (pathname.startsWith(`${USER_BASE}/api/`)) return null;
  if (pathname.startsWith(`${USER_BASE}/auth/`)) return null;
  if (!isProtectedUserPage(pathname)) return null;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.sub || token.isActive === false) {
    const url = request.nextUrl.clone();
    url.pathname = "/modules/user/auth/sign-in";
    url.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(url);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const adminDecision = await handleAdminRouteGuard(request);
  if (adminDecision) return adminDecision;

  const userDecision = await handleUserRouteGuard(request);
  if (userDecision) return userDecision;

  return NextResponse.next();
}

export const config = {
  matcher: ["/modules/admin/:path*", "/modules/user/:path*"],
};
