// Module: Provides schema-capability probes for review tables (migration-safe branching).
import prisma from "@/app/lib/prisma";

// `true` is cached permanently; `false` is re-checked until migration adds the column.
let cachedProductReviewHasIsActive: true | null = null;

/**
 * Check whether ProductReview has the isActive column.
 */
export async function productReviewHasIsActiveColumn(): Promise<boolean> {
  // check live schema for soft-delete support; cache positive results permanently.
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

/**
 * Reset cached review schema capability (mainly for tests).
 */
export function resetProductReviewIsActiveCache() {
  // manual reset is used in tests or hot-reloaded schema migrations.
  cachedProductReviewHasIsActive = null;
}
