// Middleware for Next.js app: rate limiting, route guards (admin/user), legacy path handling
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/backend/modules/auth/admin-session";
import { RATE_LIMIT_POLICIES } from "@/app/lib/rate-limit-config";

// Path bases for reference throughout middleware
const ADMIN_BASE = "/features/admin";
const USER_BASE = "/features/user";
const LEGACY_BASE = "/modules";

// Routes that only super admins can access
const SUPER_ADMIN_ONLY_PREFIXES = [
  "/features/admin/role-permissions",
  "/features/admin/api/role-config",
] as const;
// User pages requiring authentication
const PROTECTED_USER_PREFIXES = [
  "/features/user/cart",
  "/features/user/checkout",
  "/features/user/orders",
  "/features/user/profile",
  "/features/user/wishlist",
  "/features/user/support/chat",
];

// Type for tracking basic rate limit state in-memory
type InMemoryRateLimitBucket = { count: number; resetAt: number };
const RATE_LIMIT_HEADER_KEYS = {
  limit: "X-RateLimit-Limit",
  remaining: "X-RateLimit-Remaining",
  reset: "X-RateLimit-Reset",
  prefixedLimit: "X-CJY-RateLimit-Limit",
  prefixedRemaining: "X-CJY-RateLimit-Remaining",
  prefixedReset: "X-CJY-RateLimit-Reset",
} as const;

// Using a global to persist rate limit state for the lifetime of the serverless instance
declare global {
  var __middlewareRateLimitBuckets:
    | Map<string, InMemoryRateLimitBucket>
    | undefined;
}

// Get or initialize the global in-memory bucket map
function getRateLimitBuckets() {
  if (!globalThis.__middlewareRateLimitBuckets) {
    globalThis.__middlewareRateLimitBuckets = new Map();
  }
  return globalThis.__middlewareRateLimitBuckets;
}

// Determine request IP from headers (for rate limiting)
// Falls back to "unknown" if not available
function requestIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

// Used to check if pathname is for a support conversation's messages endpoint
function isSupportMessagePath(pathname: string, base: string): boolean {
  if (!pathMatchesPrefix(pathname, base)) return false;
  return pathname.endsWith("/messages");
}

// Returns appropriate rate limiting config for request, otherwise null
function resolveRateLimitRule(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  if (method !== "POST") return null;

  if (pathMatchesPrefix(pathname, "/features/user/api/auth")) {
    return {
      keyPrefix: RATE_LIMIT_POLICIES.authPost.keyPrefix,
      max: RATE_LIMIT_POLICIES.authPost.max,
      windowSeconds: RATE_LIMIT_POLICIES.authPost.windowSeconds,
      retryAfterSeconds: RATE_LIMIT_POLICIES.authPost.retryAfterSeconds,
    };
  }

  if (
    pathMatchesPrefix(pathname, "/features/user/api/paypal/orders") &&
    pathname.endsWith("/capture")
  ) {
    return {
      keyPrefix: RATE_LIMIT_POLICIES.paypalCapture.keyPrefix,
      max: RATE_LIMIT_POLICIES.paypalCapture.max,
      windowSeconds: RATE_LIMIT_POLICIES.paypalCapture.windowSeconds,
      retryAfterSeconds: RATE_LIMIT_POLICIES.paypalCapture.retryAfterSeconds,
    };
  }

  if (
    isSupportMessagePath(pathname, "/features/user/api/support/conversations")
  ) {
    return {
      keyPrefix: RATE_LIMIT_POLICIES.supportUserMessage.keyPrefix,
      max: RATE_LIMIT_POLICIES.supportUserMessage.max,
      windowSeconds: RATE_LIMIT_POLICIES.supportUserMessage.windowSeconds,
      retryAfterSeconds:
        RATE_LIMIT_POLICIES.supportUserMessage.retryAfterSeconds,
    };
  }

  if (
    isSupportMessagePath(pathname, "/features/admin/api/support/conversations")
  ) {
    return {
      keyPrefix: RATE_LIMIT_POLICIES.supportAdminMessage.keyPrefix,
      max: RATE_LIMIT_POLICIES.supportAdminMessage.max,
      windowSeconds: RATE_LIMIT_POLICIES.supportAdminMessage.windowSeconds,
      retryAfterSeconds:
        RATE_LIMIT_POLICIES.supportAdminMessage.retryAfterSeconds,
    };
  }

  return null;
}

// Enforces a simple in-memory rate limit.
// Returns blocking response on 429, otherwise optional headers for successful requests.
function enforceRateLimit(request: NextRequest): {
  blockedResponse: NextResponse | null;
  headers?: Record<string, string>;
} {
  const rule = resolveRateLimitRule(request);
  if (!rule) return { blockedResponse: null };

  const now = Date.now();
  const key = `${rule.keyPrefix}:${requestIp(request)}`;
  const buckets = getRateLimitBuckets();

  // Garbage-collect buckets if the map grows too large
  if (buckets.size > 5000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + rule.windowSeconds * 1000;
    buckets.set(key, {
      count: 1,
      resetAt,
    });
    return {
      blockedResponse: null,
      headers: {
        [RATE_LIMIT_HEADER_KEYS.limit]: String(rule.max),
        [RATE_LIMIT_HEADER_KEYS.remaining]: String(Math.max(0, rule.max - 1)),
        [RATE_LIMIT_HEADER_KEYS.reset]: String(
          Math.max(1, Math.ceil((resetAt - now) / 1000)),
        ),
        [RATE_LIMIT_HEADER_KEYS.prefixedLimit]: String(rule.max),
        [RATE_LIMIT_HEADER_KEYS.prefixedRemaining]: String(
          Math.max(0, rule.max - 1),
        ),
        [RATE_LIMIT_HEADER_KEYS.prefixedReset]: String(
          Math.max(1, Math.ceil((resetAt - now) / 1000)),
        ),
      },
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, rule.max - existing.count);
  const resetSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count <= rule.max) {
    return {
      blockedResponse: null,
      headers: {
        [RATE_LIMIT_HEADER_KEYS.limit]: String(rule.max),
        [RATE_LIMIT_HEADER_KEYS.remaining]: String(remaining),
        [RATE_LIMIT_HEADER_KEYS.reset]: String(resetSeconds),
        [RATE_LIMIT_HEADER_KEYS.prefixedLimit]: String(rule.max),
        [RATE_LIMIT_HEADER_KEYS.prefixedRemaining]: String(remaining),
        [RATE_LIMIT_HEADER_KEYS.prefixedReset]: String(resetSeconds),
      },
    };
  }

  // Deny too many requests
  return {
    blockedResponse: NextResponse.json(
      {
        error: "rate_limited",
        message: "Too many requests. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rule.retryAfterSeconds),
          [RATE_LIMIT_HEADER_KEYS.limit]: String(rule.max),
          [RATE_LIMIT_HEADER_KEYS.remaining]: String(remaining),
          [RATE_LIMIT_HEADER_KEYS.reset]: String(resetSeconds),
          [RATE_LIMIT_HEADER_KEYS.prefixedLimit]: String(rule.max),
          [RATE_LIMIT_HEADER_KEYS.prefixedRemaining]: String(remaining),
          [RATE_LIMIT_HEADER_KEYS.prefixedReset]: String(resetSeconds),
        },
      },
    ),
  };
}

// Returns true if the path matches the provided prefix (exact or startsWith)
function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Checks if the pathname is an admin API route
function isAdminApiPath(pathname: string): boolean {
  return pathMatchesPrefix(pathname, `${ADMIN_BASE}/api`);
}

// Returns true if the path is super admin-only
function isSuperAdminOnlyPath(pathname: string): boolean {
  return SUPER_ADMIN_ONLY_PREFIXES.some((prefix) =>
    pathMatchesPrefix(pathname, prefix),
  );
}

// Expected shape of admin session probe response
type AdminSessionProbeResult = {
  authenticated?: boolean;
  user?: { role?: string; isActive?: boolean } | null;
};

// Probes the session endpoint to get the role of the signed-in admin
async function probeAdminSessionRole(
  request: NextRequest,
): Promise<"SUPER_ADMIN" | "ADMIN" | "STAFF" | null> {
  try {
    const cookie = request.headers.get("cookie") ?? "";
    if (!cookie) return null;
    const probeUrl = new URL(`${ADMIN_BASE}/api/auth/session`, request.url);
    const response = await fetch(probeUrl, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as AdminSessionProbeResult;
    if (!data?.authenticated || !data.user?.role) return null;
    const role = String(data.user.role);
    if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "STAFF") {
      return role;
    }
    return null;
  } catch {
    return null;
  }
}

// Returns a JSON or redirect response if admin request is denied (401/403)
function denyAdminRequest(
  request: NextRequest,
  status: 401 | 403,
  message: string,
): NextResponse {
  const { pathname } = request.nextUrl;
  if (isAdminApiPath(pathname)) {
    return NextResponse.json(
      { error: status === 401 ? "unauthorized" : "forbidden", message },
      { status },
    );
  }
  const url = request.nextUrl.clone();
  if (status === 401) {
    url.pathname = "/features/admin/auth/sign-in";
    url.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(url);
  }
  url.pathname = "/features/admin/dashboard";
  return NextResponse.redirect(url);
}

// Determines if a user pathname requires authentication
function isProtectedUserPage(pathname: string): boolean {
  return PROTECTED_USER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Fast cookie probe for NextAuth sessions to avoid expensive JWT decode on page requests.
function hasUserSessionCookie(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value,
  );
}

// Admin route protection middleware. Returns a NextResponse if denied, null to continue.
async function handleAdminRouteGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith(ADMIN_BASE)) return null;
  if (pathname.startsWith(`${ADMIN_BASE}/auth/sign-in`)) return null;
  // skip session probe endpoints
  if (pathMatchesPrefix(pathname, `${ADMIN_BASE}/api/auth/session`))
    return null;

  const raw = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const token = raw ? await verifyAdminSessionToken(raw) : null;

  if (!token?.sub) {
    return denyAdminRequest(request, 401, "Please sign in to continue.");
  }
  if (token.isActive === false) {
    return denyAdminRequest(
      request,
      403,
      "Your account is inactive and cannot access admin routes.",
    );
  }
  if (isSuperAdminOnlyPath(pathname)) {
    if (token.role === "SUPER_ADMIN") return null;
    // check fresh role if not in token
    const latestRole = await probeAdminSessionRole(request);
    if (latestRole !== "SUPER_ADMIN") {
      return denyAdminRequest(
        request,
        403,
        "Only super admins can access this resource.",
      );
    }
  }
  return null;
}

// User route protection middleware. Returns a redirect response if not authenticated.
async function handleUserRouteGuard(
  request: NextRequest,
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith(USER_BASE)) return null;
  if (pathname.startsWith(`${USER_BASE}/api/`)) return null;
  if (pathname.startsWith(`${USER_BASE}/auth/`)) return null;
  if (!isProtectedUserPage(pathname)) return null;
  if (!hasUserSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/features/user/auth/sign-in";
    url.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(url);
  }
  return null;
}

// Main middleware function to handle all incoming requests
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle rewrite of legacy routes under /modules to new /features paths
  if (pathname === LEGACY_BASE || pathname.startsWith(`${LEGACY_BASE}/`)) {
    const url = request.nextUrl.clone();
    const nextPath = pathname.replace(LEGACY_BASE, "/features");
    url.pathname = nextPath || "/features";
    return NextResponse.redirect(url);
  }

  // Enforce per-route rate limiting for APIs prone to abuse
  const rateLimited = enforceRateLimit(request);
  if (rateLimited.blockedResponse) return rateLimited.blockedResponse;

  // Protect admin routes, override user guard if matched
  const adminDecision = await handleAdminRouteGuard(request);
  if (adminDecision) return adminDecision;

  // Protect key user pages that require authentication
  const userDecision = await handleUserRouteGuard(request);
  if (userDecision) return userDecision;

  // No guards or rate limiters triggered; continue normally
  const response = NextResponse.next();
  if (rateLimited.headers) {
    for (const [key, value] of Object.entries(rateLimited.headers)) {
      response.headers.set(key, value);
    }
  }
  return response;
}

// Matcher config: restrict middleware to /modules, /features/admin, /features/user
export const config = {
  matcher: [
    "/modules/:path*",
    "/features/admin/:path*",
    "/features/user/:path*",
  ],
};
