import { isAxiosError } from "@/app/utils/http";

export function messageFromReviewSubmitError(error: unknown): string {
  const message =
    isAxiosError<{ error?: string }>(error) && error.response?.data?.error
      ? error.response.data.error
      : "Failed to submit review.";
  return message === "Unauthorized"
    ? "Please sign in to submit a rating and comment."
    : message;
}
