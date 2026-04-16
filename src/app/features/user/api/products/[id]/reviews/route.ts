import { NextResponse } from "next/server";
import {
  createOrUpdateProductReview,
  createReviewSchema,
  listProductReviews,
} from "@/backend/modules/review";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const getErrorText = (error: unknown) =>
  error instanceof Error ? error.message : "Internal Server Error";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const productId = Number(id);
    const reviews = await listProductReviews(productId);
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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const productId = Number(id);
    const raw = (await request.json().catch(() => null)) as unknown;
    const rawObj =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const parsed = createReviewSchema.safeParse({
      ...rawObj,
      productId,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const review = await createOrUpdateProductReview({
      productId: parsed.data.productId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });

    return NextResponse.json(review, { status: 200 });
  } catch (error: unknown) {
    const message = getErrorText(error);
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
