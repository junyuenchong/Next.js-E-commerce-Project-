import { NextResponse } from "next/server";
import { replyProductReview } from "@/backend/modules/review";
import { updateReviewReplySchema } from "@/shared/schema/admin";
import { adminApiRequireCatalogAccess } from "@/backend/core/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const g = await adminApiRequireCatalogAccess();
  if (!g.ok) return g.response;

  try {
    const { id } = await context.params;
    const reviewId = Number(id);
    const json = (await request.json().catch(() => null)) as unknown;
    const bodyParsed = updateReviewReplySchema.safeParse(json);
    if (!bodyParsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const replyText = bodyParsed.data.adminReply ?? "";
    const updated = await replyProductReview(reviewId, replyText);
    const aid = adminActorNumericId(g.user);
    if (aid != null) {
      void logAdminAction({
        actorUserId: aid,
        action: "review.reply",
        targetType: "Review",
        targetId: String(reviewId),
        metadata: { hasReply: Boolean(replyText.trim()) },
      });
    }
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return jsonInternalServerError(
      error,
      "[admin/api/reviews/[id]/reply PATCH]",
    );
  }
}
