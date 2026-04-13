import { NextResponse } from "next/server";
import { listAllReviewsAdminService } from "@/backend/modules/review/review.service";
import { adminApiRequireCatalogAccess } from "@/backend/lib/admin-api-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const g = await adminApiRequireCatalogAccess();
  if (!g.ok) return g.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(
    1,
    Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
  );
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(
    Math.max(5, Number.isFinite(limitRaw) ? limitRaw : 20),
    100,
  );
  const skip = (page - 1) * limit;
  const q = searchParams.get("q")?.trim() || undefined;
  const productIdRaw = searchParams.get("productId");
  const productId =
    productIdRaw != null && productIdRaw !== ""
      ? Number.parseInt(productIdRaw, 10)
      : undefined;

  try {
    const { rows, total } = await listAllReviewsAdminService({
      skip,
      take: limit,
      q,
      productId:
        productId != null && Number.isFinite(productId) && productId > 0
          ? productId
          : undefined,
    });
    return NextResponse.json(
      { reviews: rows, total, page, limit },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
