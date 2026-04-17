/**
 * Admin HTTP route: reviews/[id].
 */

import { NextResponse } from "next/server";
import { deleteProductReviewAdminService } from "@/backend/modules/review";
import { adminApiRequire } from "@/backend/core/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { jsonInternalServerError } from "@/backend/lib/api-error";

// Delete a product review by id (admin moderation).
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await adminApiRequire("product.delete");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const reviewId = parseInt(id, 10);
  if (!Number.isFinite(reviewId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    await deleteProductReviewAdminService(reviewId);
    const aid = adminActorNumericId(guard.user);
    if (aid != null) {
      void logAdminAction({
        actorUserId: aid,
        action: "review.delete",
        targetType: "Review",
        targetId: String(reviewId),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && /not[_ -]?found/i.test(error.message)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return jsonInternalServerError(error, "[admin/api/reviews/[id] DELETE]");
  }
}
