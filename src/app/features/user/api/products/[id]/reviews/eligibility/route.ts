import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/backend/modules/auth";
import { hasUserPurchasedProduct } from "@/backend/modules/review";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Checks whether current user purchased this product and can review it.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const productId = Number(id);
    if (!Number.isFinite(productId) || productId < 1) {
      return NextResponse.json({ eligible: false }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userIdRaw = (session as { user?: { id?: unknown } | null } | null)
      ?.user?.id;
    const userId =
      userIdRaw != null ? Number.parseInt(String(userIdRaw), 10) : NaN;

    if (!Number.isFinite(userId) || userId < 1) {
      return NextResponse.json({ eligible: false });
    }

    const purchased = await hasUserPurchasedProduct(userId, productId);
    return NextResponse.json({ eligible: Boolean(purchased) });
  } catch {
    return NextResponse.json({ eligible: false }, { status: 200 });
  }
}
