"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { http, getErrorMessage } from "@/app/lib/network";
import { useUser } from "@/app/features/user/components/client/UserContext";
import { postProductReview } from "@/app/lib/api/user";

export type OrderItemDto = {
  id: string;
  productId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
};

export type OrderDetailDto = {
  id: string;
  status: string;
  currency: string;
  total: number;
  discountAmount: number;
  coupon: string | null;
  paypalOrderId: string;
  paypalCaptureId: string | null;
  invoice: {
    number: string;
    issuedAt: string;
    status: string;
    previewText: string;
    downloadUrl: string;
  } | null;
  emailSnapshot: string | null;
  shipping: {
    line1: string | null;
    city: string | null;
    postcode: string | null;
    country: string | null;
    method: string | null;
  };
  createdAt: string;
  items: OrderItemDto[];
};

async function fetchOrder(id: string): Promise<OrderDetailDto> {
  const { data } = await http.get<{ order: OrderDetailDto }>(
    `/features/user/api/orders/${id}`,
  );
  return data.order;
}

// This hook keeps page-level order fetching and review mutations out of the UI tree.
export function useOrderDetailPage() {
  const { user, isLoading: sessionLoading } = useUser();
  const params = useParams<{ id: string }>();
  const orderId = String(params?.id ?? "");
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentSuccess = searchParams.get("payment") === "success";

  const [showPaymentSuccessDialog, setShowPaymentSuccessDialog] =
    useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<OrderItemDto | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewErr, setReviewErr] = useState<string | null>(null);
  const [receivedBusy, setReceivedBusy] = useState(false);
  const [receivedErr, setReceivedErr] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ["user-order-detail", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: Boolean(user && orderId),
    staleTime: 5_000,
  });

  // Sync URL `?payment=success` into a local dialog state (allows dismiss + URL cleanup).
  useEffect(() => {
    setShowPaymentSuccessDialog(paymentSuccess);
  }, [paymentSuccess]);

  const order = orderQuery.data;
  const created = useMemo(
    () => (order ? new Date(order.createdAt).toLocaleString() : ""),
    [order],
  );
  const subtotal = useMemo(
    () =>
      order
        ? Math.max(
            0,
            order.items.reduce(
              (sum, item) => sum + item.unitPrice * item.quantity,
              0,
            ),
          )
        : 0,
    [order],
  );
  const orderComplete = String(order?.status).toLowerCase() === "fulfilled";
  const orderStatus = String(order?.status).toLowerCase();
  const canPayAgain = orderStatus === "pending";
  const canMarkReceived =
    orderStatus === "shipped" || orderStatus === "delivered";

  const openReviewDialog = (item: OrderItemDto) => {
    setReviewTarget(item);
    setReviewRating(5);
    setReviewComment("");
    setReviewErr(null);
    setReviewDialogOpen(true);
  };

  const closeReviewDialog = () => {
    setReviewDialogOpen(false);
    setReviewErr(null);
  };

  const closePaymentSuccessDialog = () => {
    if (!order) return;
    setShowPaymentSuccessDialog(false);
    router.replace(`/features/user/orders/${order.id}`);
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    setReviewBusy(true);
    setReviewErr(null);
    try {
      await postProductReview(reviewTarget.productId, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewDialogOpen(false);
    } catch (error: unknown) {
      setReviewErr(getErrorMessage(error, "Could not submit review."));
    } finally {
      setReviewBusy(false);
    }
  };

  const markReceived = async () => {
    if (!order) return;
    setReceivedBusy(true);
    setReceivedErr(null);
    try {
      await http.post(`/features/user/api/orders/${order.id}/received`, {});
      await orderQuery.refetch();
    } catch (error: unknown) {
      const axiosLike = error as { response?: { data?: { error?: string } } };
      const code = axiosLike.response?.data?.error;
      const msg =
        code === "not_receivable"
          ? "This order cannot be marked as received yet."
          : getErrorMessage(error, "Could not mark as received.");
      setReceivedErr(msg);
    } finally {
      setReceivedBusy(false);
    }
  };

  return {
    created,
    orderId,
    id: orderId,
    order,
    orderComplete,
    canPayAgain,
    canMarkReceived,
    receivedBusy,
    receivedErr,
    paymentSuccess,
    query: orderQuery,
    reviewBusy,
    reviewComment,
    reviewDialogOpen,
    reviewErr,
    reviewRating,
    reviewTarget,
    router,
    sessionLoading,
    showPaymentSuccessDialog,
    subtotal,
    user,
    closePaymentSuccessDialog,
    closeReviewDialog,
    openReviewDialog,
    setReviewComment,
    setReviewRating,
    submitReview,
    markReceived,
  };
}
