"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import http from "@/app/utils/http";
import { adminApiPaths } from "@/app/features/admin/components/client";
import { AuditLogDetailsCell } from "@/app/features/admin/components/client/audit/auditLogDetails";

type AuditRow = {
  id: number;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { id: number; email: string | null; name: string | null } | null;
};

type AuditSort = "newest" | "oldest" | "action-a-z";
type PagePayload = {
  items: AuditRow[];
  nextCursor: number | null;
  sort?: AuditSort;
};

// Convert machine-style keys into readable labels.
function toHumanLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminAuditLogClient() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [sort, setSort] = useState<AuditSort>("newest");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load one audit-log page, optionally appending to current rows.
  const load = useCallback(
    async (cursor: number | null, append: boolean, currentSort: AuditSort) => {
      const params = new URLSearchParams({ limit: "40" });
      params.set("sort", currentSort);
      if (cursor != null) params.set("cursor", String(cursor));
      const { data } = await http.get<PagePayload>(
        `${adminApiPaths.auditLog}?${params}`,
      );
      setRows((prev) => (append ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    },
    [],
  );

  // Reload list when sort order changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "40", sort });
        const { data } = await http.get<PagePayload>(
          `${adminApiPaths.auditLog}?${params}`,
        );
        if (!cancelled) {
          setRows(data.items);
          setNextCursor(data.nextCursor);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Could not load audit log. You may need the “View admin audit log” permission.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sort]);

  // Load the next audit-log page from cursor.
  const loadMore = useCallback(async () => {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      await load(nextCursor, true, sort);
    } catch {
      setError("Failed to load more.");
    } finally {
      setLoadingMore(false);
    }
  }, [load, nextCursor, loadingMore, sort]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <Link
          href="/features/admin/dashboard"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Audit log</h1>
        <p className="mt-1 text-sm text-gray-600">
          Append-only record of admin mutations (orders, users, catalog,
          coupons, reviews, uploads, permission profiles).
        </p>
        <div className="mt-3 flex items-center gap-2">
          <label
            htmlFor="audit-sort"
            className="text-xs font-medium text-gray-600"
          >
            Sort
          </label>
          <select
            id="audit-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as AuditSort)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="action-a-z">Action A-Z</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Time (UTC)
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Action
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Actor
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Target
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                Summary
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  No entries yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80">
                  <td className="whitespace-nowrap px-3 py-3 align-top text-gray-700">
                    {new Date(r.createdAt)
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 19)}
                  </td>
                  <td className="px-3 py-3 align-top text-gray-900">
                    {toHumanLabel(r.action)}
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-3 align-top text-gray-700">
                    {r.actor?.email ??
                      r.actor?.name ??
                      (r.actor ? `#${r.actor.id}` : "—")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 align-top text-gray-700">
                    {toHumanLabel(r.targetType)}{" "}
                    {r.targetId != null ? `#${r.targetId}` : ""}
                  </td>
                  <td className="min-w-[240px] max-w-lg px-3 py-3 align-top">
                    <AuditLogDetailsCell
                      action={r.action}
                      metadata={r.metadata}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {nextCursor != null ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void loadMore()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
