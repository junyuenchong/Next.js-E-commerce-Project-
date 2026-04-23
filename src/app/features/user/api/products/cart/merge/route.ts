/**
 * cart merge api
 * merge guest cart into logged-in user
 */
import { NextResponse } from "next/server";
import {
  getCartWithLiveProductsService,
  mergeGuestCartToUserService,
} from "@/backend/modules/cart";

// Detects Prisma connectivity failures for clearer API responses.
function isPrismaUnreachableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: unknown };
  return anyErr.code === "P1001";
}

// Merges guest cart into signed-in cart and returns fresh cart snapshot.
export async function POST() {
  try {
    await mergeGuestCartToUserService();
    const cart = await getCartWithLiveProductsService();
    return NextResponse.json(cart, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    console.error("POST cart merge error:", error);
    if (isPrismaUnreachableError(error)) {
      return NextResponse.json(
        {
          message: "Database is unreachable.",
          hint: "Check your DATABASE_URL and make sure your Postgres/Neon instance is running and reachable from this machine/network.",
          ...(process.env.NODE_ENV === "development"
            ? { error: error instanceof Error ? error.message : String(error) }
            : null),
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        message: "Internal Server Error",
        ...(process.env.NODE_ENV === "development"
          ? { error: error instanceof Error ? error.message : String(error) }
          : null),
      },
      { status: 500 },
    );
  }
}
