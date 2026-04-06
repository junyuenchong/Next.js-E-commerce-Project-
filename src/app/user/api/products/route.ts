// Product API route: handles fetching and adding products

export const dynamic = "force-dynamic";
export const revalidate = 30; // Cache for 30 seconds

import { getAllProducts, searchProducts } from "@/actions/product";
import { getProductsByCategorySlug } from "@/actions/category";
import { getAllProductsCursor } from "@/actions/product";
import { getProductsByCategorySlugCursor } from "@/actions/category";
import { addToCart } from "@/actions/cart";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");
  const cursorParam = searchParams.get("cursor");
  const q = searchParams.get("q") || "";
  const categorySlug = searchParams.get("category");

  const limit = limitParam ? parseInt(limitParam, 10) : 20; // Increased default limit
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const cursorId = cursorParam ? parseInt(cursorParam, 10) : undefined;

  let products;
  try {
    if (q.trim()) {
      products = await searchProducts(q);
    } else if (categorySlug) {
      products =
        cursorId != null && Number.isFinite(cursorId)
          ? await getProductsByCategorySlugCursor(categorySlug, limit, cursorId)
          : await getProductsByCategorySlug(categorySlug, limit, page);
    } else {
      products =
        cursorId != null && Number.isFinite(cursorId)
          ? await getAllProductsCursor(limit, cursorId)
          : await getAllProducts(limit, page);
    }

    const list = Array.isArray(products) ? products : [];
    const nextCursor =
      list.length > 0 ? (list[list.length - 1] as { id?: number }).id : null;

    // Add performance headers
    const headers = {
      "Cache-Control": "no-store", // Always fetch fresh data
      "x-nextjs-cache-tags": "products",
      "Content-Type": "application/json",
      "x-response-time": Date.now().toString(), // For debugging
      "x-products-count": list.length.toString(),
      "x-next-cursor": nextCursor != null ? String(nextCursor) : "",
    };

    // Cursor pagination response shape: `{ items, nextCursor }`
    if (cursorParam != null) {
      return NextResponse.json(
        { items: list, nextCursor },
        { status: 200, headers },
      );
    }

    // Backward-compatible response: array for legacy page-based callers
    return NextResponse.json(list, {
      status: 200,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { productId, quantity } = await req.json();
    console.log("Received productId:", productId, "Type:", typeof productId);
    const parsedProductId = Number(productId);
    if (!parsedProductId || isNaN(parsedProductId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }
    const result = await addToCart(parsedProductId, Number(quantity) || 1);
    return NextResponse.json({ success: true, cart: result }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
