import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getAllProductsCursor,
  searchProducts,
  updateProduct,
} from "@/backend/modules/product";
import {
  serializeAdminProductListItem,
  type ProductListItem,
  type ProductPublicListStats,
} from "@/backend/modules/product/product.repo";
import { NextResponse } from "next/server";
import { bustAdminAnalyticsCache } from "@/app/lib/admin-cache";
import {
  clampAdminListLimit,
  parseAdminCursorId,
} from "@/app/lib/admin-pagination";
import {
  adminApiRequire,
  adminApiRequireCatalogAccess,
} from "@/backend/lib/admin-api-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const g = await adminApiRequire("product.create");
  if (!g.ok) return g.response;

  try {
    const body = await req.json();
    const product = await createProduct(body);
    void bustAdminAnalyticsCache();
    return NextResponse.json(product, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const g = await adminApiRequireCatalogAccess();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");
  const cursorParam = searchParams.get("cursor");
  const q = searchParams.get("q") || "";

  const limit = clampAdminListLimit(limitParam, 20);
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const cursorId = parseAdminCursorId(cursorParam);

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
    const serialized = list.map((row) =>
      serializeAdminProductListItem(
        row as ProductListItem & ProductPublicListStats,
      ),
    );
    const nextCursor =
      serialized.length > 0
        ? (serialized[serialized.length - 1] as { id?: number }).id
        : null;
    const headers = {
      "Cache-Control": "no-store",
      "x-nextjs-cache-tags": "products",
      "Content-Type": "application/json",
      "x-response-time": Date.now().toString(),
      "x-products-count": serialized.length.toString(),
      "x-next-cursor": nextCursor != null ? String(nextCursor) : "",
    };

    // Cursor pagination response shape: `{ items, nextCursor }`
    if (cursorParam != null) {
      return NextResponse.json(
        {
          items: serialized,
          nextCursor,
          hasMore: serialized.length >= limit,
          limit,
        },
        { status: 200, headers },
      );
    }

    // Backward-compatible response: plain array when `cursor` is omitted
    return NextResponse.json(serialized, { status: 200, headers });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const g = await adminApiRequire("product.update");
  if (!g.ok) return g.response;

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
    void bustAdminAnalyticsCache();

    return NextResponse.json(updated, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const g = await adminApiRequire("product.delete");
  if (!g.ok) return g.response;

  const idRaw = new URL(req.url).searchParams.get("id");
  const id = idRaw ? Number.parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    await deleteProduct(id);
    void bustAdminAnalyticsCache();
    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
