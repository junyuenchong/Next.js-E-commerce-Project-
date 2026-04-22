"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPriceRM } from "@/app/lib/format-price";
import { getUserOrderStatusLabel } from "@/app/lib/order-status";
import InvoiceDialog from "@/app/components/shared/InvoiceDialog";
import { useOrderDetailPage } from "@/app/features/user/hooks";

export default function OrderDetailPage() {
  const {
    created,
    orderId,
    orderComplete,
    query: orderQuery,
    reviewBusy,
    reviewComment,
    reviewDialogOpen,
    reviewErr,
    reviewRating,
    reviewTarget,
    canPayAgain,
    canMarkReceived,
    receivedBusy,
    receivedErr,
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
  } = useOrderDetailPage();

  // Keep loading/unauthenticated/error branches explicit before main render.
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
          href={`/features/user/auth/sign-in?returnUrl=${encodeURIComponent(`/features/user/orders/${orderId}`)}`}
          className="text-blue-600 font-medium hover:underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (orderQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="min-h-screen bg-gray-50 py-16 px-4 text-center">
        <p className="text-red-700 mb-4">Could not load order.</p>
        <Link
          href="/features/user/orders"
          className="text-blue-600 hover:underline"
        >
          Back to orders
        </Link>
      </div>
    );
  }

  // Narrow the query result once so the render tree stays simple.
  const order = orderQuery.data;

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
              Thanks! Your order #{order.id} is confirmed and we&apos;re
              preparing it now.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closePaymentSuccessDialog}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Close
              </button>
              <Link
                href={`/features/user/orders/${order.id}`}
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
            <h1 className="text-2xl font-bold text-gray-900">
              Order #{order.id}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {created} ·{" "}
              <span className="uppercase">
                {getUserOrderStatusLabel(order.status)}
              </span>
            </p>
          </div>
          <Link
            href="/features/user/orders"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </Link>
        </div>

        {receivedErr ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {receivedErr}
          </div>
        ) : null}

        {canPayAgain || canMarkReceived ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-700">
              {canPayAgain
                ? "Payment is pending. You can pay again from checkout."
                : "Confirm receipt to complete this order and unlock reviews."}
            </div>
            <div className="flex flex-wrap gap-2">
              {canPayAgain ? (
                <Link
                  href="/features/user/checkout"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Pay again
                </Link>
              ) : null}
              {canMarkReceived ? (
                <button
                  type="button"
                  disabled={receivedBusy}
                  onClick={() => void markReceived()}
                  className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {receivedBusy ? "Updating…" : "Received"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Items</h2>
          <ul className="divide-y divide-gray-100">
            {order.items.map((orderItem) => (
              <li key={orderItem.id} className="py-3 flex gap-3">
                <div className="h-14 w-14 rounded-md bg-gray-100 overflow-hidden shrink-0">
                  {orderItem.imageUrl ? (
                    <Image
                      src={orderItem.imageUrl}
                      alt={orderItem.title}
                      width={56}
                      height={56}
                      className="h-14 w-14 object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    {orderItem.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    Qty {orderItem.quantity}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-gray-900">
                    {formatPriceRM(orderItem.unitPrice * orderItem.quantity)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPriceRM(orderItem.unitPrice)} each
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
                Reviews are available only after your order is fulfilled.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {order.items.map((orderItem) => (
                  <button
                    key={`review-btn-${orderItem.id}`}
                    type="button"
                    onClick={() => openReviewDialog(orderItem)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Review: {orderItem.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 space-y-2">
            <h2 className="font-semibold text-gray-900">Shipping address</h2>
            {order.shipping.line1 ||
            order.shipping.city ||
            order.shipping.postcode ||
            order.shipping.country ? (
              <>
                <div className="text-sm text-gray-700 space-y-0.5">
                  {order.shipping.line1 ? (
                    <div>{order.shipping.line1}</div>
                  ) : null}
                  {order.shipping.postcode || order.shipping.city ? (
                    <div>
                      {[order.shipping.postcode, order.shipping.city]
                        .filter(Boolean)
                        .join(" ")}
                    </div>
                  ) : null}
                  {order.shipping.country ? (
                    <div>{order.shipping.country}</div>
                  ) : null}
                </div>
                {order.shipping.method ? (
                  <div className="text-xs text-gray-500">
                    Method: {order.shipping.method}
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
                <span className="font-mono break-all">
                  {order.paypalOrderId}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Capture:</span>{" "}
                <span className="font-mono break-all">
                  {order.paypalCaptureId ?? "-"}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Receipt email: {order.emailSnapshot ?? user.email ?? "-"}
            </div>
            {order.invoice ? (
              <div className="pt-2 text-xs text-gray-600 space-y-2">
                <p>
                  Invoice:{" "}
                  <span className="font-mono text-gray-800">
                    {order.invoice.number}
                  </span>
                </p>
                <InvoiceDialog
                  invoiceNumber={order.invoice.number}
                  issuedAt={order.invoice.issuedAt}
                  status={order.invoice.status}
                  initialContent={order.invoice.previewText}
                  downloadUrl={order.invoice.downloadUrl}
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
            {order.discountAmount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  Discount{order.coupon ? ` (${order.coupon})` : ""}
                </span>
                <span className="text-emerald-700">
                  - {formatPriceRM(order.discountAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-semibold text-gray-900">
                {formatPriceRM(order.total)} {order.currency}
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          Need help? Use the chat bubble and mention{" "}
          <span className="font-mono">Order #{order.id}</span>.
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
                onClick={closeReviewDialog}
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
