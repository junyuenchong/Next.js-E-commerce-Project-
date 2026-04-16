"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onCancel?: () => void;
        onError: (err: unknown) => void;
      }) => { render: (el: HTMLElement) => Promise<void> };
    };
  }
}

export type PayPalShippingPayload = {
  line1: string;
  city: string;
  postcode: string;
  country: string;
  method: string;
};

type PayPalCheckoutButtonsProps = {
  clientId: string;
  currencyCode: string;
  smsTo?: string;
  shipping?: PayPalShippingPayload;
  disabled?: boolean;
  onPaid: (payload: { orderId: number }) => void;
  onError: (message: string) => void;
};

export default function PayPalCheckoutButtons({
  clientId,
  currencyCode,
  smsTo,
  shipping,
  disabled,
  onPaid,
  onError,
}: PayPalCheckoutButtonsProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    if (!clientId.trim()) return;
    const id = "paypal-sdk-script";
    if (document.getElementById(id)) {
      setSdkReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId,
    )}&currency=${encodeURIComponent(currencyCode)}&intent=capture`;
    s.onload = () => setSdkReady(true);
    s.onerror = () => onError("Could not load PayPal.");
    document.body.appendChild(s);
  }, [clientId, currencyCode, onError]);

  const renderButtons = useCallback(async () => {
    const el = hostRef.current;
    const paypal = window.paypal;
    if (!el || !paypal?.Buttons || disabled) return;
    el.innerHTML = "";
    await paypal
      .Buttons({
        createOrder: async () => {
          const res = await fetch("/features/user/api/paypal/orders", {
            method: "POST",
            credentials: "include",
          });
          const data = (await res.json().catch(() => null)) as {
            id?: string;
            error?: string;
          } | null;
          if (!res.ok) {
            const code = data?.error ?? "create_failed";
            const msg =
              code === "empty_cart"
                ? "Your cart is empty."
                : code === "insufficient_stock"
                  ? "Some items are out of stock. Please refresh your cart."
                  : code === "cart_amount_mismatch_refresh_cart"
                    ? "Your cart total changed. Please refresh and try again."
                    : "Could not start PayPal checkout. Try again.";
            throw new Error(msg);
          }
          if (!data?.id) throw new Error("Missing PayPal order id.");
          return data.id;
        },
        onApprove: async (data) => {
          const body = JSON.stringify({
            smsTo: smsTo ?? "",
            shipping: shipping ?? {},
          });
          const res = await fetch(
            `/features/user/api/paypal/orders/${encodeURIComponent(data.orderID)}/capture`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body,
            },
          );
          const json = (await res.json().catch(() => null)) as {
            ok?: boolean;
            error?: string;
            hint?: string;
            order?: { id?: number };
          } | null;
          if (!res.ok) {
            const code = json?.error ?? "capture_failed";
            const msg =
              code === "cart_amount_mismatch_refresh_cart"
                ? "Your cart total changed. Please refresh your cart and try again."
                : code === "insufficient_stock"
                  ? "Some items are out of stock. Please refresh your cart."
                  : code === "order_persist_failed"
                    ? (json?.hint ??
                      "Payment may have succeeded; please contact support.")
                    : "Payment capture failed. You can try again.";
            throw new Error(msg);
          }
          if (!json?.ok) throw new Error("Payment was not completed.");
          const orderId = json?.order?.id;
          if (typeof orderId !== "number" || !Number.isFinite(orderId)) {
            throw new Error(
              "Payment completed, but order id is missing. Please check your orders.",
            );
          }
          onPaid({ orderId });
        },
        onCancel: () => {
          onError("Payment was cancelled. Your cart is still saved.");
        },
        onError: (err) => {
          console.error("[PayPal]", err);
          const msg =
            err instanceof Error && err.message.trim()
              ? err.message
              : "PayPal reported an error. Try again.";
          onError(msg);
        },
      })
      .render(el);
  }, [disabled, onError, onPaid, shipping, smsTo]);

  useEffect(() => {
    if (!sdkReady || disabled) return;
    void renderButtons();
  }, [sdkReady, disabled, renderButtons]);

  if (!clientId.trim()) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <p className="text-sm font-medium">
          PayPal payment is temporarily unavailable.
        </p>
        <p className="mt-1 text-xs">
          Missing PayPal client id. Set{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">
            NEXT_PUBLIC_PAYPAL_CLIENT_ID
          </code>{" "}
          (or{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">
            PAYPAL_CLIENT_ID
          </code>
          ) and refresh.
        </p>
      </div>
    );
  }

  return <div ref={hostRef} className="min-h-[48px]" />;
}
