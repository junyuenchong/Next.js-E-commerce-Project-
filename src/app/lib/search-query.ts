/**
 * search query helpers
 * normalize query param; empty means browse mode (null)
 */
export function parseSearchQuery(
  raw: string | string[] | null | undefined,
): string | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const t = s?.trim();
  if (!t) return null;
  return t.slice(0, 500);
}
