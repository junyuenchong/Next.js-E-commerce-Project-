"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import {
  adminApiPaths,
  patchAdminReviewReply,
} from "@/app/modules/admin/components/client/http";
import { useAdminToast } from "@/app/providers/AdminProviders";

type ReviewRow = {
  id: number;
  productId: number;
  rating: number;
  comment: string;
  adminReply: string | null;
  createdAt: string;
  user: { id: number; name: string | null; email: string | null };
  product: { id: number; title: string; slug: string };
};

type ReviewsResponse = {
  reviews: ReviewRow[];
  total: number;
  page: number;
  limit: number;
};

export default function AdminReviews() {
  const { showToast } = useAdminToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [committedQ, setCommittedQ] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-reviews-list", page, committedQ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");
      if (committedQ.trim()) params.set("q", committedQ.trim());
      const { data } = await http.get<ReviewsResponse>(
        `${adminApiPaths.reviews}?${params.toString()}`,
      );
      return data;
    },
  });

  const applySearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setPage(1);
      setCommittedQ(q.trim());
    },
    [q],
  );

  const saveReply = useCallback(
    async (reviewId: number) => {
      const text = (drafts[reviewId] ?? "").trim();
      if (!text) {
        showToast("Reply cannot be empty.", "error");
        return;
      }
      setSavingId(reviewId);
      try {
        await patchAdminReviewReply(reviewId, text);
        showToast("Reply saved.");
        await listQuery.refetch();
      } catch (err) {
        showToast(getErrorMessage(err, "Failed to save reply"), "error");
      } finally {
        setSavingId(null);
      }
    },
    [drafts, listQuery, showToast],
  );

  const rows = listQuery.data?.reviews ?? [];
  const total = listQuery.data?.total ?? 0;
  const limit = listQuery.data?.limit ?? 15;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reviews</h1>
        <p className="mt-1 text-sm text-gray-600">
          Customer reviews across products. Replies use the standard admin
          review API (no realtime).
        </p>
      </div>

      <form onSubmit={applySearch} className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search comment or reply…"
          className="min-w-[200px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Search
        </button>
      </form>

      {listQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : listQuery.isError ? (
        <p className="text-sm text-red-600">
          {getErrorMessage(listQuery.error, "Load failed")}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews match.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/modules/user/product/${r.product.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {r.product.title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {r.user.name ?? r.user.email} · {r.rating}/5 ·{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-800">{r.comment}</p>
              {r.adminReply && (
                <p className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-700">
                  <span className="font-medium text-gray-600">Admin: </span>
                  {r.adminReply}
                </p>
              )}
              <textarea
                className="mt-3 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                rows={2}
                placeholder="Write or update admin reply…"
                value={drafts[r.id] ?? r.adminReply ?? ""}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [r.id]: e.target.value }))
                }
              />
              <button
                type="button"
                disabled={savingId === r.id}
                onClick={() => void saveReply(r.id)}
                className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingId === r.id ? "Saving…" : "Save reply"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
