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
} from "@/backend/modules/cart/cart.service";
import { NextResponse } from "next/server";

// --- Type Definitions ---
type CartItem = {
  productId: number;
  quantity: number;
};

type Cart = {
  id: string;
  items: CartItem[];
};

// --- GET: Fetch the cart with live product data ---
export async function GET() {
  try {
    const cart = await getCartWithLiveProducts();

    return NextResponse.json(cart, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    console.error("GET cart error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// --- POST: Handle cart actions ---
export async function POST(req: Request) {
  try {
    const raw = (await req.json().catch(() => null)) as unknown;
    const parsed = cartMutationSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
