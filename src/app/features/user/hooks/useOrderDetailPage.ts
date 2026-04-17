"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { useUser } from "@/app/features/user/components/client/UserContext";
import { postProductReview } from "@/app/features/user/components/client/http";

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
  const id = String(params?.id ?? "");
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

  const query = useQuery({
    queryKey: ["user-order-detail", id],
    queryFn: () => fetchOrder(id),
    enabled: Boolean(user && id),
    staleTime: 5_000,
  });

  // Sync URL `?payment=success` into a local dialog state (allows dismiss + URL cleanup).
  useEffect(() => {
    setShowPaymentSuccessDialog(paymentSuccess);
  }, [paymentSuccess]);

  const order = query.data;
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

  return {
    created,
    id,
    order,
    orderComplete,
    paymentSuccess,
    query,
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
  };
}
