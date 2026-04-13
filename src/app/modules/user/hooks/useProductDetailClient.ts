import { useCallback, useMemo, useState, type FormEvent } from "react";
import type { ProductDetailPayload } from "@/app/modules/user/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRealtimeQuery } from "./useRealtimeQuery";
import { qk } from "@/app/lib/query-keys";
import { messageFromReviewSubmitError } from "@/app/lib/review-errors";
import {
  fetchProductById,
  fetchProductReviews,
  postProductReview,
} from "@/app/modules/user/client";

export type ProductReview = {
  id: number;
  rating: number;
  comment: string;
  adminReply?: string | null;
  createdAt: string;
  user: {
    id: number;
    name?: string | null;
    email: string;
    image?: string | null;
  };
};

export function useProductDetailClient(
  productId: string | number,
  initialProduct: ProductDetailPayload,
) {
  const { data: product } = useRealtimeQuery<ProductDetailPayload>(
    qk.user.productDetail(String(productId)),
    () => fetchProductById(productId),
    {
      channels: "products",
      initialData: initialProduct,
      staleTime: 0,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  );

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: reviews = [],
    refetch: refetchReviews,
    isLoading: reviewsLoading,
  } = useRealtimeQuery<ProductReview[]>(
    ["product-reviews", String(productId)],
    () => fetchProductReviews(productId),
    {
      channels: "products",
      staleTime: 0,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    },
  );

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    return (
      reviews.reduce((sum: number, r: ProductReview) => sum + r.rating, 0) /
      reviews.length
    );
  }, [reviews]);

  const reviewMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment: string }) => {
      try {
        await postProductReview(productId, payload);
      } catch (error: unknown) {
        throw new Error(messageFromReviewSubmitError(error));
      }
    },
    onSuccess: async () => {
      setComment("");
      setReviewMessage("Review submitted successfully.");
      await queryClient.invalidateQueries({
        queryKey: ["product-reviews", String(productId)],
      });
      await refetchReviews();
    },
    onError: (error) => {
      setReviewMessage(
        error instanceof Error ? error.message : "Failed to submit review.",
      );
    },
  });

  const submitReview = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!comment.trim()) {
        setReviewMessage("Please write a comment before submitting.");
        return;
      }
      setReviewMessage(null);
      reviewMutation.mutate({ rating, comment });
    },
    [comment, rating, reviewMutation],
  );

  return {
    product,
    rating,
    setRating,
    comment,
    setComment,
    reviewMessage,
    reviews,
    reviewsLoading,
    averageRating,
    reviewMutation,
    submitReview,
  };
}
