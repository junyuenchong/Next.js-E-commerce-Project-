import {
  cartMutationSchema,
  getCartWithLiveProducts,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
} from "@/backend/modules/cart";
import {
  CART_OUT_OF_STOCK,
  CART_PRODUCT_NOT_FOUND,
  CART_PRODUCT_UNAVAILABLE,
} from "@/backend/modules/cart";
import { NextResponse } from "next/server";

// Detects Prisma connectivity errors and maps them to 503 responses.
function isPrismaUnreachableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: unknown };
  return anyErr.code === "P1001";
}

// --- Type Definitions ---
type CartItem = {
  productId: number;
  quantity: number;
};

type Cart = {
  id: string;
  items: CartItem[];
};

// Fetches cart state enriched with live product snapshots.
export async function GET() {
  try {
    const cart = await getCartWithLiveProducts();

    return NextResponse.json(cart, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    console.error("GET cart error:", error);
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

// Applies add/remove/update/clear cart mutations from one endpoint.
export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = cartMutationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request body.", error: "invalid_body" },
        { status: 400 },
      );
    }

    let cart: Cart | null = null;
    const body = parsed.data;

    switch (body.action) {
      case "add":
        cart = await addToCart(body.productId, body.quantity ?? 1);
        break;

      case "remove":
        cart = await removeFromCart(body.productId);
        break;

      case "update":
        cart = await updateCartItem(body.productId, body.quantity);
        break;

      case "clear":
        cart = await clearCart();
        break;
    }

    return NextResponse.json(cart, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === CART_PRODUCT_NOT_FOUND) {
      return NextResponse.json(
        { error: "Product not found.", code: "not_found" },
        { status: 404 },
      );
    }
    if (message === CART_OUT_OF_STOCK) {
      return NextResponse.json(
        {
          error: "Not enough stock for this product.",
          code: "out_of_stock",
        },
        { status: 409 },
      );
    }
    if (message === CART_PRODUCT_UNAVAILABLE) {
      return NextResponse.json(
        {
          error: "This product is no longer available.",
          code: "product_unavailable",
        },
        { status: 409 },
      );
    }
    console.error("POST cart error:", error);
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
