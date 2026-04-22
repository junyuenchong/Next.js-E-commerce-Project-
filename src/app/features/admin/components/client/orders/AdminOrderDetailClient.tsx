"use client";

import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { useAdminResourceSSE } from "@/app/features/admin/shared";
import InvoiceDialog from "@/app/components/shared/InvoiceDialog";

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
  shippingCarrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: number; email: string | null; name: string | null } | null;
  invoice: {
    id: number;
    invoiceNumber: string;
    issuedAt: string;
    status: string;
    previewText: string;
    downloadUrl: string;
  } | null;
  items: OrderLine[];
};

type Me = {
  can: { orderRead: boolean; orderUpdate: boolean; orderRefund: boolean };
};
type StockMutationAction = "NONE" | "DEDUCT" | "RESTOCK";
type OrderStatusUpdateResponse = {
  id: number;
  status: OrderStatus;
  stockMutation?: StockMutationAction;
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

function adminOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Payment pending";
    case "paid":
      return "Paid";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "fulfilled":
      return "Fulfilled";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

// Format money safely with a currency fallback.
function formatMoney(amount: number, currency: string) {
  try {
    // Note: Malaysia-first formatting (still respects passed currency code).
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// Normalize optional text input to nullable API value.
function normalizeOptionalText(value: string): string | null {
  const v = value.trim();
  return v ? v : null;
}

// Build tracking URL for known carriers from carrier + tracking number.
function buildTrackingUrl(
  carrierInput: string,
  trackingNumberInput: string,
): string | null {
  const carrier = carrierInput.trim().toLowerCase();
  const trackingNumber = trackingNumberInput.trim();
  if (!carrier || !trackingNumber) return null;

  const encoded = encodeURIComponent(trackingNumber);

  if (carrier.includes("j&t") || carrier.includes("jnt")) {
    return `https://www.jtexpress.my/track?consignment_no=${encoded}`;
  }
  if (carrier.includes("pos laju") || carrier.includes("poslaju")) {
    return `https://www.pos.com.my/send/ratecalculator?trackingNo=${encoded}`;
  }
  if (carrier.includes("dhl")) {
    return `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encoded}`;
  }
  if (carrier.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encoded}`;
  }

  return null;
}

export default function AdminOrderDetailClient({
  orderId,
}: {
  orderId: number;
}) {
  const [draftStatus, setDraftStatus] = useState<OrderStatus | null>(null);
  const [shipmentDraft, setShipmentDraft] = useState({
    shippingCarrier: "",
    trackingNumber: "",
    trackingUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [savingShipment, setSavingShipment] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Feature: keep admin permissions responsive without constant refetch jitter.
  // Guard: login/logout path explicitly clears this cache to prevent role bleed.
  // Note: short stale window smooths route switches inside one active session.
  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: async () => (await http.get<Me>("/features/admin/api/me")).data,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const orderQuery = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: async () =>
      (await http.get<OrderDetail>(`/features/admin/api/orders/${orderId}`))
        .data,
  });

  useAdminResourceSSE(
    "/features/admin/api/events/orders",
    () => {
      void orderQuery.refetch();
    },
    15000,
  );

  const order = orderQuery.data;

  // Reset local drafts whenever base order data changes.
  useEffect(() => {
    setDraftStatus(null);
    setShipmentDraft({
      shippingCarrier: order?.shippingCarrier ?? "",
      trackingNumber: order?.trackingNumber ?? "",
      trackingUrl: order?.trackingUrl ?? "",
    });
  }, [
    order?.id,
    order?.shippingCarrier,
    order?.trackingNumber,
    order?.trackingUrl,
  ]);

  const effectiveStatus = draftStatus ?? order?.status ?? "pending";

  const canSave = useMemo(() => {
    if (!order || !me || draftStatus == null || draftStatus === order.status)
      return false;
    if (draftStatus === "cancelled") return me.can.orderRefund;
    return me.can.orderUpdate;
  }, [draftStatus, me, order]);

  const shipmentDirty = useMemo(() => {
    if (!order) return false;
    return (
      normalizeOptionalText(shipmentDraft.shippingCarrier) !==
        (order.shippingCarrier ?? null) ||
      normalizeOptionalText(shipmentDraft.trackingNumber) !==
        (order.trackingNumber ?? null) ||
      normalizeOptionalText(shipmentDraft.trackingUrl) !==
        (order.trackingUrl ?? null)
    );
  }, [order, shipmentDraft]);

  const canSaveShipment = (me?.can.orderUpdate ?? false) && shipmentDirty;
  const generatedTrackingUrl = useMemo(
    () =>
      buildTrackingUrl(
        shipmentDraft.shippingCarrier,
        shipmentDraft.trackingNumber,
      ),
    [shipmentDraft.shippingCarrier, shipmentDraft.trackingNumber],
  );

  const shippingState = useMemo(() => {
    if (!order)
      return {
        label: "Not shipped",
        tone: "text-amber-800 bg-amber-50 border-amber-200",
      };
    const hasTracking =
      Boolean(order.trackingNumber?.trim()) ||
      Boolean(order.trackingUrl?.trim());
    if (order.status === "cancelled") {
      return {
        label: "Cancelled",
        tone: "text-rose-800 bg-rose-50 border-rose-200",
      };
    }
    if (order.status === "fulfilled") {
      return {
        label: "Fulfilled",
        tone: "text-sky-800 bg-sky-50 border-sky-200",
      };
    }
    if (order.status === "delivered") {
      return {
        label: "Delivered",
        tone: "text-violet-800 bg-violet-50 border-violet-200",
      };
    }
    const markedShipped =
      order.status === "shipped" ||
      // NOTE: `delivered/fulfilled` are handled above; shippedAt/tracking does not imply status.
      false;
    if (markedShipped) {
      return {
        label: "Shipped",
        tone: "text-emerald-800 bg-emerald-50 border-emerald-200",
      };
    }
    if (hasTracking) {
      return {
        label: "Tracking available",
        tone: "text-emerald-800 bg-emerald-50 border-emerald-200",
      };
    }
    return {
      label: "Not shipped",
      tone: "text-amber-800 bg-amber-50 border-amber-200",
    };
  }, [order]);

  // Persist order status update.
  const saveStatus = useCallback(async () => {
    if (!order || draftStatus == null || !canSave) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const { data: updatedOrder } =
        await http.patch<OrderStatusUpdateResponse>(
          "/features/admin/api/orders",
          {
            orderId: order.id,
            status: draftStatus,
          },
        );
      setDraftStatus(null);
      await orderQuery.refetch();
      const stockHint =
        updatedOrder.stockMutation && updatedOrder.stockMutation !== "NONE"
          ? ` Inventory: ${updatedOrder.stockMutation}.`
          : "";
      setStatusMessage(`Status updated.${stockHint}`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Update failed"));
    } finally {
      setSaving(false);
    }
  }, [canSave, draftStatus, order, orderQuery]);

  // Persist shipping carrier and tracking information.
  const saveShipment = useCallback(async () => {
    if (!order || !canSaveShipment) return;
    setSavingShipment(true);
    setStatusMessage(null);
    try {
      await http.patch("/features/admin/api/orders", {
        orderId: order.id,
        shippingCarrier: normalizeOptionalText(shipmentDraft.shippingCarrier),
        trackingNumber: normalizeOptionalText(shipmentDraft.trackingNumber),
        trackingUrl: normalizeOptionalText(shipmentDraft.trackingUrl),
      });
      await orderQuery.refetch();
      setStatusMessage("Shipment info updated.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Shipment update failed"));
    } finally {
      setSavingShipment(false);
    }
  }, [canSaveShipment, order, orderQuery, shipmentDraft]);

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
          href="/features/admin/orders"
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
            href="/features/admin/orders"
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
                {adminOrderStatusLabel(s)}
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

      {statusMessage && (
        <p className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
          {statusMessage}
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
            <dt className="text-xs text-gray-500">Invoice</dt>
            <dd>
              {order.invoice ? (
                <div className="space-y-2">
                  <p className="font-mono text-xs text-gray-800">
                    {order.invoice.invoiceNumber}
                  </p>
                  <InvoiceDialog
                    invoiceNumber={order.invoice.invoiceNumber}
                    issuedAt={order.invoice.issuedAt}
                    status={order.invoice.status}
                    initialContent={order.invoice.previewText}
                    downloadUrl={order.invoice.downloadUrl}
                    triggerLabel="View invoice"
                  />
                </div>
              ) : (
                "—"
              )}
            </dd>
          </dl>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="font-medium text-gray-900">Shipping</h2>
          <div
            className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${shippingState.tone}`}
          >
            {shippingState.label}
          </div>
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
          {order.shippedAt && (
            <p className="mt-1 text-xs text-gray-500">
              Shipped at: {new Date(order.shippedAt).toLocaleString()}
            </p>
          )}
          {order.trackingNumber && (
            <p className="mt-1 text-xs text-gray-500">
              Tracking #: {order.trackingNumber}
            </p>
          )}
          {order.trackingUrl && (
            <p className="mt-1 text-xs text-gray-500">
              Tracking URL:{" "}
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {order.trackingUrl}
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="font-medium text-gray-900">Shipment update</h2>
        <p className="mt-1 text-xs text-gray-500">
          Update carrier and tracking details for customer delivery tracking.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-xs text-gray-600">
            Carrier
            <input
              value={shipmentDraft.shippingCarrier}
              onChange={(e) =>
                setShipmentDraft((prev) => ({
                  ...prev,
                  shippingCarrier: e.target.value,
                }))
              }
              placeholder="e.g. J&T Express"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-gray-600">
            Tracking number
            <input
              value={shipmentDraft.trackingNumber}
              onChange={(e) =>
                setShipmentDraft((prev) => ({
                  ...prev,
                  trackingNumber: e.target.value,
                }))
              }
              placeholder="e.g. JT123456789MY"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-gray-600">
            Tracking URL
            <input
              value={shipmentDraft.trackingUrl}
              onChange={(e) =>
                setShipmentDraft((prev) => ({
                  ...prev,
                  trackingUrl: e.target.value,
                }))
              }
              placeholder="https://..."
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                disabled={!generatedTrackingUrl || savingShipment}
                onClick={() =>
                  generatedTrackingUrl &&
                  setShipmentDraft((prev) => ({
                    ...prev,
                    trackingUrl: generatedTrackingUrl,
                  }))
                }
                className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] hover:bg-gray-50 disabled:opacity-50"
              >
                Auto fill URL
              </button>
              {generatedTrackingUrl ? (
                <span className="text-[11px] text-gray-500">
                  Generated from carrier + tracking number
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">
                  Supports J&T, Pos Laju, DHL, FedEx
                </span>
              )}
            </div>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void saveShipment()}
            disabled={!canSaveShipment || savingShipment}
            className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {savingShipment ? "Saving…" : "Save shipment"}
          </button>
          <button
            type="button"
            onClick={() =>
              setShipmentDraft({
                shippingCarrier: order.shippingCarrier ?? "",
                trackingNumber: order.trackingNumber ?? "",
                trackingUrl: order.trackingUrl ?? "",
              })
            }
            disabled={!shipmentDirty || savingShipment}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
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
