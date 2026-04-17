"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PayPalShippingPayload } from "@/app/features/user/components/client/Checkout/PayPalCheckoutButtons";

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

type Params = {
  clientId: string;
  currencyCode: string;
  smsTo?: string;
  shipping?: PayPalShippingPayload;
  disabled?: boolean;
  onPaid: (payload: { orderId: number }) => void;
  onError: (message: string) => void;
};

// Component-level hook: isolates PayPal SDK loading + button rendering from UI.
export function usePayPalCheckoutButtons(params: Params) {
  const { clientId, currencyCode, smsTo, shipping, disabled, onPaid, onError } =
    params;

  const hostRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);

  // Loads PayPal SDK once and marks the hook ready for button rendering.
  useEffect(() => {
    if (!clientId.trim()) return;
    const id = "paypal-sdk-script";
    if (document.getElementById(id)) {
      setSdkReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId,
    )}&currency=${encodeURIComponent(currencyCode)}&intent=capture`;
    script.onload = () => setSdkReady(true);
    script.onerror = () => onError("Could not load PayPal.");
    document.body.appendChild(script);
  }, [clientId, currencyCode, onError]);

  // Creates and renders the PayPal Buttons instance with create/capture handlers.
  const renderButtons = useCallback(async () => {
    const el = hostRef.current;
    const paypal = window.paypal;
    if (!el || !paypal?.Buttons || disabled) return;
    el.innerHTML = "";
    await paypal
      .Buttons({
        createOrder: async () => {
          const createOrderResponse = await fetch(
            "/features/user/api/paypal/orders",
            {
              method: "POST",
              credentials: "include",
            },
          );
          const createOrderPayload = (await createOrderResponse
            .json()
            .catch(() => null)) as { id?: string; error?: string } | null;
          if (!createOrderResponse.ok) {
            const code = createOrderPayload?.error ?? "create_failed";
            const errorMessage =
              code === "empty_cart"
                ? "Your cart is empty."
                : code === "insufficient_stock"
                  ? "Some items are out of stock. Please refresh your cart."
                  : code === "cart_amount_mismatch_refresh_cart"
                    ? "Your cart total changed. Please refresh and try again."
                    : "Could not start PayPal checkout. Try again.";
            throw new Error(errorMessage);
          }
          if (!createOrderPayload?.id)
            throw new Error("Missing PayPal order id.");
          return createOrderPayload.id;
        },
        onApprove: async (data) => {
          const body = JSON.stringify({
            smsTo: smsTo ?? "",
            shipping: shipping ?? {},
          });
          const captureResponse = await fetch(
            `/features/user/api/paypal/orders/${encodeURIComponent(
              data.orderID,
            )}/capture`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body,
            },
          );
          const capturePayload = (await captureResponse
            .json()
            .catch(() => null)) as {
            ok?: boolean;
            error?: string;
            hint?: string;
            order?: { id?: number };
          } | null;
          if (!captureResponse.ok) {
            const code = capturePayload?.error ?? "capture_failed";
            const errorMessage =
              code === "cart_amount_mismatch_refresh_cart"
                ? "Your cart total changed. Please refresh your cart and try again."
                : code === "insufficient_stock"
                  ? "Some items are out of stock. Please refresh your cart."
                  : code === "order_persist_failed"
                    ? (capturePayload?.hint ??
                      "Payment may have succeeded; please contact support.")
                    : "Payment capture failed. You can try again.";
            throw new Error(errorMessage);
          }
          if (!capturePayload?.ok)
            throw new Error("Payment was not completed.");
          const orderId = capturePayload?.order?.id;
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
        onError: (error) => {
          console.error("[PayPal]", error);
          const errorMessage =
            error instanceof Error && error.message.trim()
              ? error.message
              : "PayPal reported an error. Try again.";
          onError(errorMessage);
        },
      })
      .render(el);
  }, [disabled, onError, onPaid, shipping, smsTo]);

  // Re-renders buttons when SDK readiness or checkout state changes.
  useEffect(() => {
    if (!sdkReady || disabled) return;
    void renderButtons();
  }, [sdkReady, disabled, renderButtons]);

  return { hostRef, sdkReady };
}
