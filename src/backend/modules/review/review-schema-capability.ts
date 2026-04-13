import prisma from "@/app/lib/prisma";

/** When true, column is present — safe to cache forever. When false, we re-check each call until a migration adds the column. */
let cachedProductReviewHasIsActive: true | null = null;

/**
 * True when the live DB has `ProductReview.isActive` (migration applied).
 * Positive result is cached; negative is not, so adding the column without restarting the app is detected.
 */
export async function productReviewHasIsActiveColumn(): Promise<boolean> {
  if (cachedProductReviewHasIsActive === true) return true;
  try {
    const rows = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint AS c
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'ProductReview'
        AND column_name = 'isActive'
    `;
    const has = Number(rows[0]?.c ?? 0) > 0;
    if (has) cachedProductReviewHasIsActive = true;
    return has;
  } catch {
    return false;
  }
}

export function resetProductReviewIsActiveCache() {
  cachedProductReviewHasIsActive = null;
}
