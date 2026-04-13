import prisma from "@/app/lib/prisma";

/** When true, `AdminRoleDefinition.isActive` exists — safe to cache. */
let cachedAdminRoleHasIsActive: true | null = null;

/**
 * True when the live DB has `AdminRoleDefinition.isActive` (migration applied).
 * Positive result is cached; without the column we re-check each call until it appears.
 */
export async function adminRoleDefinitionHasIsActiveColumn(): Promise<boolean> {
  if (cachedAdminRoleHasIsActive === true) return true;
  try {
    const rows = await prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint AS c
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'AdminRoleDefinition'
        AND column_name = 'isActive'
    `;
    const has = Number(rows[0]?.c ?? 0) > 0;
    if (has) cachedAdminRoleHasIsActive = true;
    return has;
  } catch {
    return false;
  }
}

export function resetAdminRoleDefinitionIsActiveCache() {
  cachedAdminRoleHasIsActive = null;
}
