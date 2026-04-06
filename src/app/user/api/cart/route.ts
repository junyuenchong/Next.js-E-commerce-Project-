import {
  getCartWithLiveProducts,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart,
} from "@/actions/cart";
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
  } catch (error) {
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
    const { action, productId, quantity } = (await req.json()) as {
      action: "add" | "remove" | "update" | "clear";
      productId?: number;
      quantity?: number;
    };

    let cart: Cart | null = null;

    switch (action) {
      case "add":
        if (typeof productId !== "number") {
          return NextResponse.json(
            { error: "Missing productId" },
            { status: 400 },
          );
        }
        cart = await addToCart(productId, quantity || 1);
        break;

      case "remove":
        if (typeof productId !== "number") {
          return NextResponse.json(
            { error: "Missing productId" },
            { status: 400 },
          );
        }
        cart = await removeFromCart(productId);
        break;

      case "update":
        if (typeof productId !== "number") {
          return NextResponse.json(
            { error: "Missing productId" },
            { status: 400 },
          );
        }
        cart = await updateCartItem(productId, quantity || 1);
        break;

      case "clear":
        cart = await clearCart();
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(cart, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("POST cart error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
