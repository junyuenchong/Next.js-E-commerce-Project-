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

type SignInBody = { email?: string; password?: string };

function unknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "")
    return error.message;
  if (typeof error === "string" && error.trim() !== "") return error;
  return "Unknown error";
}

export async function getAdminSessionRoute(request: Request) {
  try {
    const cookie = request.headers.get("cookie") ?? "";
    const tokenPart = cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${ADMIN_SESSION_COOKIE_NAME}=`));
    const raw = tokenPart
      ? decodeURIComponent(tokenPart.split("=")[1] ?? "")
      : "";
    if (!raw) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const token = await verifyAdminSessionToken(raw);
    if (!token?.sub || token.isActive === false) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const userId = Number(token.sub);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const row = await findUserForAdminSessionRoute(userId);
    if (!row?.isActive || !canAccessAdminPanel(row.role)) {
      return NextResponse.json({ authenticated: false, user: null });
    }

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
    console.error("[admin auth/session GET]", error);
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        ...(process.env.NODE_ENV === "development"
          ? { error: unknownErrorMessage(error) }
          : null),
      },
      { status: 500 },
    );
  }
}

export async function postAdminSessionRoute(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SignInBody | null;
    const email = body?.email?.trim().toLowerCase() ?? "";
    const password = body?.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "invalid_body", message: "Email and password are required." },
        { status: 400 },
      );
    }

    const user = await findUserForAdminPasswordLogin(email);

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "invalid_credentials", message: "Invalid email or password." },
        { status: 401 },
      );
    }

    const valid = await verifyPasswordUserService(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "invalid_credentials", message: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (!user.isActive || !canAccessAdminPanel(user.role)) {
      return NextResponse.json(
        {
          error: "forbidden",
          message: "This account cannot access admin panel.",
        },
        { status: 403 },
      );
    }

    const adminRole =
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN" ||
      user.role === "STAFF"
        ? user.role
        : null;
    if (!adminRole) {
      return NextResponse.json(
        {
          error: "forbidden",
          message: "This account cannot access admin panel.",
        },
        { status: 403 },
      );
    }

    const token = await signAdminSessionToken({
      sub: String(user.id),
      role: adminRole,
      isActive: user.isActive,
    });

    const response = NextResponse.json({ ok: true, role: user.role });
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/modules/admin",
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("[admin auth/session POST]", error);
    return NextResponse.json(
      {
        error: "server_error",
        message: "Internal Server Error",
        ...(process.env.NODE_ENV === "development"
          ? { detail: unknownErrorMessage(error) }
          : null),
      },
      { status: 500 },
    );
  }
}

export async function deleteAdminSessionRoute() {
  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/modules/admin",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("[admin auth/session DELETE]", error);
    return NextResponse.json(
      {
        error: "server_error",
        message: "Internal Server Error",
        ...(process.env.NODE_ENV === "development"
          ? { detail: unknownErrorMessage(error) }
          : null),
      },
      { status: 500 },
    );
  }
}
