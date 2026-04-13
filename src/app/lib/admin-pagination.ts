/** Shared cursor + page-size limits for admin list APIs (orders, users, audit, …). */

export const ADMIN_LIST_LIMIT_MIN = 1;
export const ADMIN_LIST_LIMIT_MAX = 100;

export const ADMIN_LIST_DEFAULT = {
  orders: 40,
  users: 50,
  audit: 40,
} as const;

/**
 * Parses `limit` query param into a safe page size (defaults when missing/invalid).
 */
export function clampAdminListLimit(
  limitRaw: string | null,
  fallback: number,
): number {
  const base = Math.min(
    Math.max(fallback, ADMIN_LIST_LIMIT_MIN),
    ADMIN_LIST_LIMIT_MAX,
  );
  if (limitRaw == null || limitRaw === "") return base;
  const n = Number.parseInt(limitRaw, 10);
  const v = Number.isFinite(n) ? n : fallback;
  return Math.min(ADMIN_LIST_LIMIT_MAX, Math.max(ADMIN_LIST_LIMIT_MIN, v));
}

/** Cursor: next page is strictly older rows by numeric `id`. */
export function parseAdminCursorId(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
