import { useCallback, useMemo, useState, type FormEvent } from "react";
import type { ProductDetailPayload } from "@/app/features/user/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeQuery } from "./useRealtimeQuery";
import { qk } from "@/app/lib/realtime";
import { messageFromReviewSubmitError } from "@/app/lib/product";
import { useUser } from "@/app/features/user/components/client/UserContext";
import {
  fetchProductById,
  fetchProductReviews,
  fetchProductReviewEligibility,
  postProductReview,
} from "@/app/lib/api/user";

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

export function useProductDetail(
  productId: string | number,
  initialProduct: ProductDetailPayload,
) {
  const { user, isLoading: sessionLoading } = useUser();
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
    data: eligibility,
    isLoading: eligibilityLoading,
    error: eligibilityError,
  } = useQuery({
    queryKey: ["product-review-eligibility", String(productId), user?.id ?? 0],
    queryFn: async () => {
      const eligibilityResponse =
        await fetchProductReviewEligibility(productId);
      return eligibilityResponse?.eligible === true;
    },
    enabled: Boolean(user) && !sessionLoading,
    staleTime: 30_000,
  });

  const canReview = !eligibilityError && eligibility === true;

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
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (sessionLoading) {
        setReviewMessage("Checking your sign-in status...");
        return;
      }
      if (!user) {
        setReviewMessage("Please sign in to submit a rating and comment.");
        return;
      }
      if (!comment.trim()) {
        setReviewMessage("Please write a comment before submitting.");
        return;
      }
      setReviewMessage(null);
      reviewMutation.mutate({ rating, comment });
    },
    [comment, rating, reviewMutation, sessionLoading, user],
  );

  return {
    product,
    user,
    sessionLoading,
    canReview,
    eligibilityLoading,
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
