import { NextResponse } from "next/server";
import { mergeGuestCartToUser } from "@/actions/cart-actions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

/**
 * Merge guest cart into user's cart after login.
 * Returns the merged cart or error if not logged in.
 */
export async function POST() {
  // Get current user session
  const session = await getServerSession(authOptions);

  // Extract userId from session (id or sub)
  let userId: number | null = null;
  if (session?.user) {
    const u: { id?: string | number; sub?: string | number } = session.user as {
      id?: string | number;
      sub?: string | number;
    };
    userId = Number(u.id ?? u.sub) || null;
  }

  // If no user, return error
  if (!userId) {
    return NextResponse.json({ success: false, cart: null, error: "No user in session" });
  }

  // Merge guest cart to user cart
  const userCart = await mergeGuestCartToUser();

  // Return merged cart
  return NextResponse.json({ success: true, cart: userCart });
}