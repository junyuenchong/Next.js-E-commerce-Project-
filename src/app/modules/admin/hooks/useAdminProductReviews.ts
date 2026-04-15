"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/app/utils/http";
import {
  deleteAdminReview,
  fetchAdminProductReviews,
  patchAdminReviewReply,
} from "@/app/modules/admin/components/client";

export type AdminReviewItem = {
  id: number;
  rating: number;
  comment: string;
  adminReply?: string | null;
  isActive?: boolean;
  user: {
    name?: string | null;
    email: string;
  };
};

export function useAdminProductReviews(productId: number) {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const data = await fetchAdminProductReviews(productId);
      setReviews(Array.isArray(data) ? data : []);
      setReplyDrafts((prev) => {
        const next = { ...prev };
        (Array.isArray(data) ? data : []).forEach(
          (review: { id: number; adminReply?: string | null }) => {
            next[review.id] = review.adminReply ?? "";
          },
        );
        return next;
      });
    } catch (error: unknown) {
      console.error("[admin reviews] fetch failed", error);
      setReviewsError(getErrorMessage(error, "Could not load reviews."));
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const saveReply = useCallback(
    async (reviewId: number) => {
      const reply = replyDrafts[reviewId] ?? "";
      if (!reply.trim()) return;
      try {
        await patchAdminReviewReply(reviewId, reply);
        await fetchReviews();
      } catch (error: unknown) {
        console.error("[admin reviews] reply save failed", error);
        alert(getErrorMessage(error, "Could not save reply."));
      }
    },
    [replyDrafts, fetchReviews],
  );

  const removeReview = useCallback(
    async (reviewId: number) => {
      if (!confirm("Remove this review from the storefront?")) return;
      try {
        await deleteAdminReview(reviewId);
        await fetchReviews();
      } catch (error: unknown) {
        console.error("[admin reviews] delete failed", error);
        alert(getErrorMessage(error, "Could not delete review."));
      }
    },
    [fetchReviews],
  );

  return {
    reviews,
    replyDrafts,
    setReplyDrafts,
    reviewsLoading,
    reviewsError,
    fetchReviews,
    saveReply,
    removeReview,
  };
}
