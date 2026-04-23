/**
 * admin api route
 * handle products
 */

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
} from "@/backend/modules/product";
import { NextResponse } from "next/server";
import { bustAdminAnalyticsCache } from "@/backend/modules/admin-cache";
import {
  buildCursorResponseMeta,
  parseAdminListParams,
} from "@/backend/shared/pagination/list-pagination";
import {
  adminApiRequire,
  adminApiRequireCatalogAccess,
} from "@/backend/core/admin-api-guard";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  const guard = await adminApiRequire("product.create");
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const product = await createProduct(body);
    void bustAdminAnalyticsCache();
    return NextResponse.json(product, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error && typeof error.message === "string"
        ? error.message
        : "";
    if (msg.startsWith("invalid_product_data:")) {
      return NextResponse.json(
        {
          error: "invalid_body",
          message: "Invalid product data",
          detail: msg.replace(/^invalid_product_data:\s*/, ""),
        },
        { status: 400 },
      );
    }
    return jsonInternalServerError(error, "[admin/api/products POST]");
  }
}

export async function GET(req: Request) {
  const guard = await adminApiRequireCatalogAccess();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get("cursor");
  const q = searchParams.get("q") || "";
  const {
    take: limit,
    page,
    cursorId,
  } = parseAdminListParams(searchParams, 20);

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
    const hasMore = serialized.length >= limit;
    const nextCursor =
      hasMore && serialized.length > 0
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

    if (cursorParam != null) {
      return NextResponse.json(
        {
          items: serialized,
          ...buildCursorResponseMeta(limit, nextCursor ?? null),
        },
        { status: 200, headers },
      );
    }

    return NextResponse.json(serialized, { status: 200, headers });
  } catch (error: unknown) {
    return jsonInternalServerError(error, "[admin/api/products GET]");
  }
}

export async function PATCH(req: Request) {
  const guard = await adminApiRequire("product.update");
  if (!guard.ok) return guard.response;

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
    const msg =
      error instanceof Error && typeof error.message === "string"
        ? error.message
        : "";
    // return 400 for validation input errors instead of 500.
    if (
      msg === "Invalid input data" ||
      msg.startsWith("invalid_product_data:")
    ) {
      return NextResponse.json(
        {
          error: "invalid_body",
          message: "Invalid product data",
          detail: msg.startsWith("invalid_product_data:")
            ? msg.replace(/^invalid_product_data:\s*/, "")
            : msg,
        },
        { status: 400 },
      );
    }
    return jsonInternalServerError(error, "[admin/api/products PATCH]");
  }
}

export async function DELETE(req: Request) {
  const guard = await adminApiRequire("product.delete");
  if (!guard.ok) return guard.response;

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
    return jsonInternalServerError(error, "[admin/api/products DELETE]");
  }
}
