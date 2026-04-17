/**
 * Admin HTTP route: products/[id]/reviews.
 */

import { NextResponse } from "next/server";
import { listProductReviewsForAdminService } from "@/backend/modules/review";
import { adminApiRequireCatalogAccess } from "@/backend/core/admin-api-guard";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Return reviews for a single product (admin view).
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await adminApiRequireCatalogAccess();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await context.params;
    const productId = Number(id);
    const reviews = await listProductReviewsForAdminService(productId);
    return NextResponse.json(reviews, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jsonInternalServerError(
      error,
      "[admin/api/products/[id]/reviews GET]",
    );
  }
}
