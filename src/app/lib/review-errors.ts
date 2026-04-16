import { isAxiosError } from "@/app/utils/http";

export function messageFromReviewSubmitError(error: unknown): string {
  const message =
    isAxiosError<{ error?: string }>(error) && error.response?.data?.error
      ? error.response.data.error
      : "Failed to submit review.";
  if (message === "Unauthorized") {
    return "Please sign in to submit a rating and comment.";
  }
  if (message === "Please purchase this product before submitting a review") {
    return "Only customers who purchased this product can leave a review.";
  }
  return message;
}
