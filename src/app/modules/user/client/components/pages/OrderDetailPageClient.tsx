"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/lib/http";
import { formatPriceRM } from "@/app/lib/format-price";
import { useUser } from "@/app/modules/user/client/components/UserContext";

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
    `/modules/user/api/orders/${id}`,
  );
  return data.order;
}

export default function OrderDetailPageClient() {
  const { user, isLoading: sessionLoading } = useUser();
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");

  const q = useQuery({
    queryKey: ["user-order-detail", id],
    queryFn: () => fetchOrder(id),
    enabled: Boolean(user && id),
    staleTime: 5_000,
  });

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
          href={`/modules/user/auth/sign-in?returnUrl=${encodeURIComponent(`/modules/user/orders/${id}`)}`}
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
          href="/modules/user/orders"
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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{o.id}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {created} · <span className="uppercase">{o.status}</span>
            </p>
          </div>
          <Link
            href="/modules/user/orders"
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
    </div>
  );
}
