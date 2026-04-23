export const dynamic = "force-dynamic";
export const revalidate = 30;

import { serializeProductCardListForClient } from "@/app/lib/product";
import type { ProductCardProduct } from "@/app/features/user/types";
import {
  listProductsCursorService,
  listProductsService,
  searchProductsService,
} from "@/backend/modules/product";
import {
  getProductsByCategorySlugCursorService,
  getProductsByCategorySlugService,
} from "@/backend/modules/category";
import { addToCart } from "@/backend/modules/cart";
import {
  CART_OUT_OF_STOCK,
  CART_PRODUCT_NOT_FOUND,
  CART_PRODUCT_UNAVAILABLE,
} from "@/backend/modules/cart";
import { NextResponse } from "next/server";

type ListMode = "search" | "category" | "all";

// Returns product cards for search/category/browse with optional cursor pagination.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");
  const cursorParam = searchParams.get("cursor");
  const searchQuery = searchParams.get("q") || "";
  const categorySlug = searchParams.get("category");

  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const cursorId = cursorParam ? parseInt(cursorParam, 10) : undefined;
  const useCursor = cursorId != null && Number.isFinite(cursorId);

  const mode: ListMode = searchQuery.trim()
    ? "search"
    : categorySlug
      ? "category"
      : "all";

  try {
    let products: unknown;
    switch (mode) {
      case "search":
        products = await searchProductsService(searchQuery);
        break;
      case "category":
        products = useCursor
          ? await getProductsByCategorySlugCursorService(
              categorySlug!,
              limit,
              cursorId,
            )
          : await getProductsByCategorySlugService(categorySlug!, limit, page);
        break;
      default:
        products = useCursor
          ? await listProductsCursorService(limit, cursorId)
          : await listProductsService(limit, page);
    }

    const raw = Array.isArray(products) ? products : [];
    const list = serializeProductCardListForClient(raw as ProductCardProduct[]);
    const nextCursor =
      list.length > 0 ? (list[list.length - 1] as { id?: number }).id : null;

    const headers = {
      "Cache-Control": "no-store",
      "x-nextjs-cache-tags": "products",
      "Content-Type": "application/json",
      "x-response-time": String(Date.now()),
      "x-products-count": String(list.length),
      "x-next-cursor": nextCursor != null ? String(nextCursor) : "",
    };

    switch (cursorParam != null) {
      case true:
        return NextResponse.json(
          { items: list, nextCursor },
          { status: 200, headers },
        );
      default:
        return NextResponse.json(list, { status: 200, headers });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

// Adds one product to the current user's cart.
export async function POST(req: Request) {
  try {
    const { productId, quantity } = await req.json();
    const parsedProductId = Number(productId);
    switch (true) {
      case !Number.isFinite(parsedProductId) || parsedProductId <= 0:
        return NextResponse.json(
          { error: "Invalid productId" },
          { status: 400 },
        );
    }
    const result = await addToCart(parsedProductId, Number(quantity) || 1);
    return NextResponse.json({ success: true, cart: result }, { status: 200 });
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
