// Shared pagination primitives used by backend modules.
import { parsePositiveInt } from "@/backend/shared/number";

export const ADMIN_LIST_LIMIT_MAX = 100;

export const ADMIN_LIST_DEFAULT = {
  orders: 40,
  users: 50,
  audit: 40,
} as const;

export function toPositiveOrUndefined(value?: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  if (value == null || value <= 0) return undefined;
  return Math.trunc(value);
}

export function resolveListTake(
  value: number | undefined,
  fallback: number,
  max?: number,
): number {
  const normalizedFallback = Math.max(1, Math.trunc(fallback));
  const candidate = toPositiveOrUndefined(value) ?? normalizedFallback;
  if (max == null) return candidate;
  return Math.min(Math.max(1, Math.trunc(max)), candidate);
}

export function resolvePageNumber(value?: number, fallback = 1): number {
  const normalizedFallback = Math.max(1, Math.trunc(fallback));
  const candidate = toPositiveOrUndefined(value);
  return candidate ?? normalizedFallback;
}

type ResolveOffsetPageParams = {
  limit?: number;
  page?: number;
  fallbackTake?: number;
  maxTake?: number;
};

export function resolveOffsetPage(params: ResolveOffsetPageParams): {
  take: number | undefined;
  skip: number | undefined;
} {
  const { limit, page, fallbackTake, maxTake } = params;
  const take =
    fallbackTake == null
      ? toPositiveOrUndefined(limit)
      : resolveListTake(limit, fallbackTake, maxTake);
  const skip = take == null ? undefined : (resolvePageNumber(page) - 1) * take;
  return { take, skip };
}

export function buildCursorPage<T extends { id: number }>(
  rows: T[],
  limit: number,
) {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;
  return { page, nextCursor };
}

export function clampAdminListLimit(
  limitRaw: string | null,
  fallback: number,
): number {
  const base = resolveListTake(fallback, fallback, ADMIN_LIST_LIMIT_MAX);
  if (limitRaw == null || limitRaw === "") return base;
  const n = Number.parseInt(limitRaw, 10);
  const v = Number.isFinite(n) ? n : base;
  return resolveListTake(v, base, ADMIN_LIST_LIMIT_MAX);
}

export function parseAdminCursorId(raw: string | null): number | undefined {
  return parsePositiveInt(raw);
}

export function parseAdminListParams(
  searchParams: URLSearchParams,
  fallbackLimit: number,
): {
  take: number;
  page: number;
  cursorId: number | undefined;
} {
  return {
    take: clampAdminListLimit(searchParams.get("limit"), fallbackLimit),
    page: resolvePageNumber(parsePositiveInt(searchParams.get("page"))),
    cursorId: parseAdminCursorId(searchParams.get("cursor")),
  };
}

export function buildCursorResponseMeta(
  limit: number,
  nextCursor: number | null,
): {
  nextCursor: number | null;
  hasMore: boolean;
  limit: number;
} {
  return {
    nextCursor,
    hasMore: nextCursor != null,
    limit,
  };
}
