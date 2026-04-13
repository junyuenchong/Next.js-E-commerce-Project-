import { NextResponse } from "next/server";
import { listProductReviewsForAdminService } from "@/backend/modules/review/review.service";
import { adminApiRequireCatalogAccess } from "@/backend/lib/admin-api-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const getErrorText = (error: unknown) =>
  error instanceof Error ? error.message : "Internal Server Error";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const g = await adminApiRequireCatalogAccess();
  if (!g.ok) return g.response;

  try {
    const { id } = await context.params;
    const productId = Number(id);
    const reviews = await listProductReviewsForAdminService(productId);
    return NextResponse.json(reviews, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: getErrorText(error),
      },
      { status: 500 },
    );
  }
}
