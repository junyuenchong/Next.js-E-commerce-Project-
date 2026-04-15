"use client";

import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";

type OrderLine = {
  id: number;
  productId: number;
  title: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

type OrderDetail = {
  id: number;
  userId: number | null;
  status: OrderStatus;
  currency: string;
  total: number;
  discountAmount: number;
  couponCodeSnapshot: string | null;
  paypalOrderId: string;
  paypalCaptureId: string | null;
  emailSnapshot: string | null;
  shippingLine1: string | null;
  shippingCity: string | null;
  shippingPostcode: string | null;
  shippingCountry: string | null;
  shippingMethod: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: number; email: string | null; name: string | null } | null;
  items: OrderLine[];
};

type Me = {
  can: { orderRead: boolean; orderUpdate: boolean; orderRefund: boolean };
};

const STATUS_FLOW: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "fulfilled",
  "cancelled",
];

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function AdminOrderDetail({ orderId }: { orderId: number }) {
  const [draftStatus, setDraftStatus] = useState<OrderStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: async () => (await http.get<Me>("/modules/admin/api/me")).data,
    staleTime: 60_000,
  });

  const orderQuery = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: async () =>
      (await http.get<OrderDetail>(`/modules/admin/api/orders/${orderId}`))
        .data,
  });

  const order = orderQuery.data;

  useEffect(() => {
    setDraftStatus(null);
  }, [order?.id]);

  const effectiveStatus = draftStatus ?? order?.status ?? "pending";

  const canSave = useMemo(() => {
    if (!order || !me || draftStatus == null || draftStatus === order.status)
      return false;
    if (draftStatus === "cancelled") return me.can.orderRefund;
    return me.can.orderUpdate;
  }, [draftStatus, me, order]);

  const saveStatus = useCallback(async () => {
    if (!order || draftStatus == null || !canSave) return;
    setSaving(true);
    setMsg(null);
    try {
      await http.patch("/modules/admin/api/orders", {
        orderId: order.id,
        status: draftStatus,
      });
      setDraftStatus(null);
      await orderQuery.refetch();
      setMsg("Status updated.");
    } catch (e) {
      setMsg(getErrorMessage(e, "Update failed"));
    } finally {
      setSaving(false);
    }
  }, [canSave, draftStatus, order, orderQuery]);

  if (orderQuery.isLoading) {
    return <p className="text-sm text-gray-500">Loading order…</p>;
  }
  if (orderQuery.isError || !order) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">
          {getErrorMessage(orderQuery.error, "Order not found.")}
        </p>
        <Link
          href="/modules/admin/orders"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href="/modules/admin/orders"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Orders
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            Order #{order.id}
          </h1>
          <p className="text-sm text-gray-600">
            {new Date(order.createdAt).toLocaleString()} · {order.currency}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={effectiveStatus}
            onChange={(e) => setDraftStatus(e.target.value as OrderStatus)}
            disabled={!me?.can.orderUpdate && !me?.can.orderRefund}
          >
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => void saveStatus()}
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save status"}
          </button>
        </div>
      </div>

      {msg && (
        <p className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
          {msg}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="font-medium text-gray-900">Customer</h2>
          <dl className="mt-3 space-y-1 text-sm text-gray-700">
            <dt className="text-xs text-gray-500">Email</dt>
            <dd>{order.user?.email ?? order.emailSnapshot ?? "—"}</dd>
            <dt className="text-xs text-gray-500">Name</dt>
            <dd>{order.user?.name ?? "—"}</dd>
            <dt className="text-xs text-gray-500">PayPal order</dt>
            <dd className="break-all font-mono text-xs">
              {order.paypalOrderId}
            </dd>
          </dl>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="font-medium text-gray-900">Shipping</h2>
          <p className="mt-3 text-sm text-gray-700">
            {[
              order.shippingLine1,
              order.shippingCity,
              order.shippingPostcode,
              order.shippingCountry,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </p>
          {order.shippingMethod && (
            <p className="mt-2 text-xs text-gray-500">
              Method: {order.shippingMethod}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-gray-900">Line items</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="border-b text-left text-xs text-gray-500">
            <tr>
              <th className="py-2">Product</th>
              <th className="py-2">Qty</th>
              <th className="py-2">Unit</th>
              <th className="py-2">Line</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.items.map((line) => (
              <tr key={line.id}>
                <td className="py-2">
                  {line.title}
                  <span className="text-gray-400"> · #{line.productId}</span>
                </td>
                <td className="py-2 tabular-nums">{line.quantity}</td>
                <td className="py-2 tabular-nums">
                  {formatMoney(line.unitPrice, order.currency)}
                </td>
                <td className="py-2 tabular-nums">
                  {formatMoney(line.unitPrice * line.quantity, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 space-y-1 text-right text-sm text-gray-700">
          <p>
            Subtotal (lines):{" "}
            {formatMoney(
              order.items.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
              order.currency,
            )}
          </p>
          {order.discountAmount > 0 ? (
            <p className="text-emerald-800">
              Discount
              {order.couponCodeSnapshot ? ` (${order.couponCodeSnapshot})` : ""}
              : −{formatMoney(order.discountAmount, order.currency)}
            </p>
          ) : null}
          <p className="text-lg font-semibold text-gray-900">
            Charged total: {formatMoney(order.total, order.currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
