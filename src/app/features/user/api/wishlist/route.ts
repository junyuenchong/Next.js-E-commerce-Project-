import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { resolveUserId } from "@/backend/core/session";
import {
  addWishlistItem,
  listWishlistForUser,
  removeWishlistItem,
  wishlistMutateSchema,
} from "@/backend/modules/wishlist";

// Returns current user's wishlist items.
export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const items = await listWishlistForUser(userId);
  return NextResponse.json(items, {
    headers: { "Cache-Control": "no-store" },
  });
}

// Adds one active product to the user's wishlist.
export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = wishlistMutateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const p = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, isActive: true },
  });
  if (!p?.isActive) {
    return NextResponse.json({ error: "product_unavailable" }, { status: 400 });
  }
  try {
    await addWishlistItem(userId, parsed.data.productId);
  } catch {
    /* unique violation — already wishlisted */
  }
  return NextResponse.json({ ok: true });
}

// Removes one product from the user's wishlist.
export async function DELETE(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const productId = Number(searchParams.get("productId"));
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "invalid_product" }, { status: 400 });
  }
  try {
    await removeWishlistItem(userId, productId);
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
