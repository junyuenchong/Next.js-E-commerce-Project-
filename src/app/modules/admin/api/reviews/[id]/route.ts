import { NextResponse } from "next/server";
import { deleteProductReviewAdminService } from "@/backend/modules/review/review.service";
import { adminApiRequire } from "@/backend/lib/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/lib/admin-action-log";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminApiRequire("product.delete");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const reviewId = parseInt(id, 10);
  if (!Number.isFinite(reviewId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    await deleteProductReviewAdminService(reviewId);
    const aid = adminActorNumericId(g.user);
    if (aid != null) {
      void logAdminAction({
        actorUserId: aid,
        action: "review.delete",
        targetType: "Review",
        targetId: String(reviewId),
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
