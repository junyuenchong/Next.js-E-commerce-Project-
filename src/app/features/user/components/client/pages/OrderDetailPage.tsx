"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { formatPriceRM } from "@/app/lib/format-price";
import { useUser } from "@/app/features/user/components/client/UserContext";
import InvoiceDialog from "@/app/components/shared/InvoiceDialog";
import { postProductReview } from "@/app/features/user/components/client/http";

type OrderItemDto = {
  id: string;
  productId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
};

type OrderDetailDto = {
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

export default function OrderDetailPage() {
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

  const q = useQuery({
    queryKey: ["user-order-detail", id],
    queryFn: () => fetchOrder(id),
    enabled: Boolean(user && id),
    staleTime: 5_000,
  });

  useEffect(() => {
    setShowPaymentSuccessDialog(paymentSuccess);
  }, [paymentSuccess]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-gray-600">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-16 px-4 text-center">
        <p className="text-gray-700 mb-6">Sign in to see order details.</p>
        <Link
          href={`/features/user/auth/sign-in?returnUrl=${encodeURIComponent(`/features/user/orders/${id}`)}`}
          className="text-blue-600 font-medium hover:underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (q.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="min-h-screen bg-gray-50 py-16 px-4 text-center">
        <p className="text-red-700 mb-4">
          {getErrorMessage(q.error, "Could not load order.")}
        </p>
        <Link
          href="/features/user/orders"
          className="text-blue-600 hover:underline"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  const o = q.data;
  const created = new Date(o.createdAt).toLocaleString();
  const subtotal = Math.max(
    0,
    o.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
  );

  const orderComplete = ["delivered", "fulfilled"].includes(
    String(o.status).toLowerCase(),
  );

  const openReviewDialog = (item: OrderItemDto) => {
    setReviewTarget(item);
    setReviewRating(5);
    setReviewComment("");
    setReviewErr(null);
    setReviewDialogOpen(true);
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
    } catch (e: unknown) {
      setReviewErr(getErrorMessage(e, "Could not submit review."));
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      {showPaymentSuccessDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Payment successful
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Thanks! Your order #{o.id} is confirmed and we&apos;re preparing
              it now.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentSuccessDialog(false);
                  router.replace(`/features/user/orders/${o.id}`);
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Close
              </button>
              <Link
                href={`/features/user/orders/${o.id}`}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                View order
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{o.id}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {created} · <span className="uppercase">{o.status}</span>
            </p>
          </div>
          <Link
            href="/features/user/orders"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Items</h2>
          <ul className="divide-y divide-gray-100">
            {o.items.map((i) => (
              <li key={i.id} className="py-3 flex gap-3">
                <div className="h-14 w-14 rounded-md bg-gray-100 overflow-hidden shrink-0">
                  {i.imageUrl ? (
                    <Image
                      src={i.imageUrl}
                      alt={i.title}
                      width={56}
                      height={56}
                      className="h-14 w-14 object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    {i.title}
                  </div>
                  <div className="text-xs text-gray-500">Qty {i.quantity}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-gray-900">
                    {formatPriceRM(i.unitPrice * i.quantity)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPriceRM(i.unitPrice)} each
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">
              Product Ratings & Comments
            </div>
            {!orderComplete ? (
              <p className="text-xs text-gray-500">
                Reviews are available after your order is completed.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {o.items.map((i) => (
                  <button
                    key={`review-btn-${i.id}`}
                    type="button"
                    onClick={() => openReviewDialog(i)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Review: {i.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-2">
            <h2 className="font-semibold text-gray-900">Shipping address</h2>
            {o.shipping.line1 ||
            o.shipping.city ||
            o.shipping.postcode ||
            o.shipping.country ? (
              <>
                <div className="text-sm text-gray-700 space-y-0.5">
                  {o.shipping.line1 ? <div>{o.shipping.line1}</div> : null}
                  {o.shipping.postcode || o.shipping.city ? (
                    <div>
                      {[o.shipping.postcode, o.shipping.city]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
                  ) : null}
                  {o.shipping.country ? <div>{o.shipping.country}</div> : null}
                </div>
                {o.shipping.method ? (
                  <div className="text-xs text-gray-500">
                    Method: {o.shipping.method}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-gray-600">
                Not provided yet. (Some payment flows don&apos;t return shipping
                details.)
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-2">
            <h2 className="font-semibold text-gray-900">Payment</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <span className="text-gray-500">PayPal order:</span>{" "}
                <span className="font-mono break-all">{o.paypalOrderId}</span>
              </div>
              <div>
                <span className="text-gray-500">Capture:</span>{" "}
                <span className="font-mono break-all">
                  {o.paypalCaptureId ?? "-"}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Receipt email: {o.emailSnapshot ?? user.email ?? "-"}
            </div>
            {o.invoice ? (
              <div className="pt-2 text-xs text-gray-600 space-y-2">
                <p>
                  Invoice:{" "}
                  <span className="font-mono text-gray-800">
                    {o.invoice.number}
                  </span>
                </p>
                <InvoiceDialog
                  invoiceNumber={o.invoice.number}
                  issuedAt={o.invoice.issuedAt}
                  status={o.invoice.status}
                  initialContent={o.invoice.previewText}
                  downloadUrl={o.invoice.downloadUrl}
                  triggerLabel="View invoice"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Summary</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatPriceRM(subtotal)}</span>
            </div>
            {o.discountAmount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  Discount{o.coupon ? ` (${o.coupon})` : ""}
                </span>
                <span className="text-emerald-700">
                  - {formatPriceRM(o.discountAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-semibold text-gray-900">
                {formatPriceRM(o.total)} {o.currency}
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Need help? Use the chat bubble and mention{" "}
          <span className="font-mono">Order #{o.id}</span>.
        </div>
      </div>

      {reviewDialogOpen && reviewTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Product Ratings & Comments
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {reviewTarget.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewDialogOpen(false)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Your rating:
                </label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                  disabled={reviewBusy}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Average</option>
                  <option value={2}>2 - Poor</option>
                  <option value={1}>1 - Bad</option>
                </select>
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Write your comment..."
                className="w-full border rounded px-3 py-2 text-sm min-h-24"
                disabled={reviewBusy}
              />
              {reviewErr ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {reviewErr}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void submitReview()}
                disabled={reviewBusy || reviewComment.trim().length === 0}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {reviewBusy ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
