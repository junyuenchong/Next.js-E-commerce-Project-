/** POST: merge guest cart into logged-in user (after sign-in). */
import { NextResponse } from "next/server";
import {
  getCartWithLiveProductsService,
  mergeGuestCartToUserService,
} from "@/backend/modules/cart/cart.service";

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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
