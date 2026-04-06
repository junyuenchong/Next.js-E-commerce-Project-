import {
  getAllProducts,
  getAllProductsCursor,
  searchProducts,
  updateProduct,
} from "@/actions/product";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");
  const cursorParam = searchParams.get("cursor");
  const q = searchParams.get("q") || "";

  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const cursorId = cursorParam ? parseInt(cursorParam, 10) : undefined;

  try {
    let products: unknown[] = [];
    if (q.trim()) {
      products = await searchProducts(q);
    } else {
      products =
        cursorId != null && Number.isFinite(cursorId)
          ? await getAllProductsCursor(limit, cursorId)
          : await getAllProducts(limit, page);
    }
    const list = Array.isArray(products) ? products : [];
    const nextCursor =
      list.length > 0 ? (list[list.length - 1] as { id?: number }).id : null;
    const headers = {
      "Cache-Control": "no-store",
      "x-nextjs-cache-tags": "products",
      "Content-Type": "application/json",
      "x-response-time": Date.now().toString(),
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
    return NextResponse.json(list, { status: 200, headers });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...data } = body as { id: number; [key: string]: unknown };
    if (!id) {
      return NextResponse.json(
        { error: "Product id is required" },
        { status: 400 },
      );
    }
    const updated = await updateProduct(Number(id), data);

    return NextResponse.json(updated, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
