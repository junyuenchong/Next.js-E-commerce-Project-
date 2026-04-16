// Feature: Implements admin session HTTP route handlers for login, lookup, and logout lifecycle.
import { NextResponse } from "next/server";
import { verifyPasswordUserService } from "@/backend/modules/user/user.service";
import { canAccessAdminPanel } from "@/backend/modules/auth/auth.service";
import {
  findUserForAdminPasswordLogin,
  findUserForAdminSessionRoute,
} from "@/backend/modules/auth/auth.repo";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  signAdminSessionToken,
  verifyAdminSessionToken,
} from "@/backend/modules/auth/admin-session";
import { unknownErrorMessage } from "@/backend/shared/api-error";

// Note: request body shape for admin sign-in payload.
type SignInBody = { email?: string; password?: string };
const ADMIN_FORBIDDEN_RESPONSE = {
  error: "forbidden",
  message: "This account cannot access admin panel.",
} as const;

function jsonDevError(
  status: number,
  body: Record<string, unknown>,
  error: unknown,
) {
  // Note: keep production responses minimal while exposing details in development.
  return NextResponse.json(
    {
      ...body,
      ...(process.env.NODE_ENV === "development"
        ? { detail: unknownErrorMessage(error) }
        : null),
    },
    { status },
  );
}

function jsonAdminForbidden() {
  // Feature: single source for admin-panel denial response body/status.
  return NextResponse.json(ADMIN_FORBIDDEN_RESPONSE, { status: 403 });
}

// Guard: validate admin session via cookie token.
export async function getAdminSessionRoute(request: Request) {
  try {
    // Guard: parse cookie header to extract admin session token.
    const cookie = request.headers.get("cookie") ?? "";
    const tokenPart = cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`));
    // Guard: decode token value from cookie pair.
    const raw = tokenPart
      ? decodeURIComponent(tokenPart.split("=")[1] ?? "")
      : "";
    if (!raw) {
      // Fallback: no session token in cookie means unauthenticated.
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Guard: verify token before touching database to avoid unnecessary reads.
    const token = await verifyAdminSessionToken(raw);
    if (!token?.sub || token.isActive === false) {
      // Fallback: invalid or inactive token returns unauthenticated state.
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Guard: parse token subject into numeric user id.
    const userId = Number(token.sub);
    if (!Number.isFinite(userId)) {
      // Fallback: non-numeric token subject returns unauthenticated state.
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Guard: re-check DB state so disabled accounts are blocked immediately.
    const row = await findUserForAdminSessionRoute(userId);
    if (!row?.isActive || !canAccessAdminPanel(row.role)) {
      // Fallback: inactive or unauthorized users are treated as unauthenticated.
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Feature: valid session returns safe user payload (never password fields).
    return NextResponse.json({
      authenticated: true,
      user: {
        id: String(row.id),
        email: row.email,
        name: row.name,
        role: row.role,
        isActive: row.isActive,
      },
    });
  } catch (error) {
    // Fallback: unexpected errors are logged and mapped to normalized JSON response.
    console.error("[admin auth/session GET]", error);
    return jsonDevError(500, { authenticated: false, user: null }, error);
  }
}

// Feature: create admin session cookie when credentials are valid.
export async function postAdminSessionRoute(request: Request) {
  try {
    // Guard: parse request body as `{ email, password }`.
    const body = (await request.json().catch(() => null)) as SignInBody | null;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";

    // Guard: require both email and password before credential lookup.
    if (!email || !password) {
      return NextResponse.json(
        { error: "invalid_body", message: "Email and password are required." },
        { status: 400 },
      );
    }

    // Feature: admin-session credential lookup is isolated from NextAuth user flow.
    const user = await findUserForAdminPasswordLogin(email);

    // Fallback: missing user/password hash maps to invalid credentials.
    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "invalid_credentials", message: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Guard: verify submitted password against stored hash.
    const valid = await verifyPasswordUserService(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "invalid_credentials", message: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Guard: only active users with admin-panel access can sign admin cookie.
    if (!user.isActive || !canAccessAdminPanel(user.role)) {
      return jsonAdminForbidden();
    }

    // Guard: admin cookie flow never accepts USER role, even with valid password.
    const adminRole =
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN" ||
      user.role === "STAFF"
        ? user.role
        : null;
    if (!adminRole) {
      return jsonAdminForbidden();
    }

    // Feature: sign new admin session token for validated user.
    const token = await signAdminSessionToken({
      sub: String(user.id),
      role: adminRole,
      isActive: user.isActive,
    });

    // Feature: set scoped admin session cookie under `/features/admin`.
    const response = NextResponse.json({ ok: true, role: user.role });
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/features/admin",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    // Fallback: unexpected login errors are logged and mapped to server error.
    console.error("[admin auth/session POST]", error);
    return jsonDevError(
      500,
      { error: "server_error", message: "Internal Server Error" },
      error,
    );
  }
}

// Feature: destroy admin session cookie for logout.
export async function deleteAdminSessionRoute() {
  try {
    // Feature: expire admin-scoped cookie to complete admin logout.
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/features/admin",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    // Fallback: logout failures are logged and mapped to server error.
    console.error("[admin auth/session DELETE]", error);
    return jsonDevError(
      500,
      { error: "server_error", message: "Internal Server Error" },
      error,
    );
  }
}
