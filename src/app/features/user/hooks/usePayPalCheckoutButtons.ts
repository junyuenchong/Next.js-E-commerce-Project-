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

type PersistedOrderPollResult =
  | { kind: "resolved"; orderId: number }
  | {
      kind: "failed";
      reason: "failed_or_cancelled" | "timeout" | "still_processing";
    };

function isContainerRemovedError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /container element removed from dom/i.test(message);
}

async function waitForPersistedOrderId(
  paypalOrderId: string,
  idempotencyKey?: string | null,
): Promise<PersistedOrderPollResult> {
  // Give webhook-first mode enough time before showing an actionable fallback.
  const maxAttempts = 25;
  for (let i = 0; i < maxAttempts; i += 1) {
    const response = await fetch(
      `/features/user/api/paypal/orders/${encodeURIComponent(paypalOrderId)}/status`,
      {
        credentials: "include",
        cache: "no-store",
        // pass same idempotency key so status endpoint can verify transaction ownership.
        headers: idempotencyKey
          ? { "x-idempotency-key": idempotencyKey }
          : undefined,
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      order?: { id?: number };
      payment?: {
        orderId?: number | null;
        status?: string;
        expiresAt?: string | null;
      };
    } | null;
    const orderId =
      payload?.order?.id ??
      (typeof payload?.payment?.orderId === "number"
        ? payload.payment.orderId
        : null);
    if (typeof orderId === "number" && Number.isFinite(orderId)) {
      return { kind: "resolved", orderId };
    }

    const paymentStatus = String(payload?.payment?.status ?? "").toUpperCase();
    if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED") {
      return { kind: "failed", reason: "failed_or_cancelled" };
    }

    const expiresAt = payload?.payment?.expiresAt
      ? new Date(payload.payment.expiresAt).getTime()
      : null;
    const shouldTimeoutByExpiry =
      paymentStatus === "PENDING" || paymentStatus === "PROCESSING";
    if (
      shouldTimeoutByExpiry &&
      expiresAt &&
      Number.isFinite(expiresAt) &&
      Date.now() > expiresAt
    ) {
      return { kind: "failed", reason: "timeout" };
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return { kind: "failed", reason: "still_processing" };
}

// Component-level hook: isolates PayPal SDK loading + button rendering from UI.
export function usePayPalCheckoutButtons(params: Params) {
  const { clientId, currencyCode, smsTo, shipping, disabled, onPaid, onError } =
    params;

  const hostRef = useRef<HTMLDivElement>(null);
  const createOrderIdempotencyKeyRef = useRef<string | null>(null);
  const mountedButtonsRef = useRef(false);
  const lastUserErrorRef = useRef<{ message: string; atMs: number } | null>(
    null,
  );
  const [sdkReady, setSdkReady] = useState(false);

  const emitUserError = useCallback(
    (message: string) => {
      const now = Date.now();
      const last = lastUserErrorRef.current;
      if (last && last.message === message && now - last.atMs < 2000) return;
      lastUserErrorRef.current = { message, atMs: now };
      onError(message);
    },
    [onError],
  );

  // Loads PayPal SDK once and marks the hook ready for button rendering.
  useEffect(() => {
    if (!clientId.trim()) return;
    const id = "paypal-sdk-script";
    const desiredSrc = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId,
    )}&currency=${encodeURIComponent(currencyCode)}&intent=capture`;
    const existing = document.getElementById(id) as HTMLScriptElement | null;

    // Reset readiness when SDK params change.
    setSdkReady(false);
    mountedButtonsRef.current = false;

    if (window.paypal && existing?.src === desiredSrc) {
      setSdkReady(true);
      return;
    }

    if (existing && existing.src !== desiredSrc) {
      existing.remove();
    }

    const script =
      existing && existing.src === desiredSrc
        ? existing
        : document.createElement("script");
    script.id = id;
    script.async = true;
    script.src = desiredSrc;

    const onLoad = () => {
      if (window.paypal?.Buttons) setSdkReady(true);
      else onError("PayPal loaded but is not ready yet. Please refresh.");
    };
    const onScriptError = () => onError("Could not load PayPal.");

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onScriptError);
    if (!script.isConnected) {
      document.body.appendChild(script);
    } else if (window.paypal?.Buttons) {
      // Existing loaded script path.
      setSdkReady(true);
    }

    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onScriptError);
    };
  }, [clientId, currencyCode, onError]);

  // Creates and renders the PayPal Buttons instance with create/capture handlers.
  const renderButtons = useCallback(async () => {
    const el = hostRef.current;
    const paypal = window.paypal;
    if (!el || !paypal?.Buttons || disabled) return;
    if (!el.isConnected) return;
    if (mountedButtonsRef.current) return;
    el.innerHTML = "";
    const buttons = paypal.Buttons({
      createOrder: async () => {
        // generate one idempotency key per checkout attempt.
        if (!createOrderIdempotencyKeyRef.current) {
          createOrderIdempotencyKeyRef.current =
            globalThis.crypto?.randomUUID?.() ??
            `paypal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }
        const createOrderHttpResponse = await fetch(
          "/features/user/api/paypal/orders",
          {
            method: "POST",
            headers: {
              "x-idempotency-key": createOrderIdempotencyKeyRef.current,
            },
            credentials: "include",
          },
        );
        const createOrderResponsePayload = (await createOrderHttpResponse
          .json()
          .catch(() => null)) as {
          id?: string;
          error?: string;
          transactionId?: string;
        } | null;
        if (!createOrderHttpResponse.ok) {
          const code = createOrderResponsePayload?.error ?? "create_failed";
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
        if (!createOrderResponsePayload?.id)
          throw new Error("Missing PayPal order id.");
        // transactionId is returned by backend for trace/debug if needed.
        if (createOrderResponsePayload.transactionId) {
          console.info(
            "[paypal] create transaction",
            createOrderResponsePayload.transactionId,
          );
        }
        return createOrderResponsePayload.id;
      },
      onApprove: async (data) => {
        const captureAttemptIdempotencyKey =
          createOrderIdempotencyKeyRef.current;
        // Capture consumes this attempt; next create should use a fresh key.
        createOrderIdempotencyKeyRef.current = null;
        const body = JSON.stringify({
          smsTo: smsTo ?? "",
          shipping: shipping ?? {},
        });
        const captureHttpResponse = await fetch(
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
        const captureResponsePayload = (await captureHttpResponse
          .json()
          .catch(() => null)) as {
          ok?: boolean;
          error?: string;
          hint?: string;
          pending?: boolean;
          transactionId?: string;
          order?: { id?: number };
        } | null;
        if (!captureHttpResponse.ok) {
          const code = captureResponsePayload?.error ?? "capture_failed";
          const errorMessage =
            code === "cart_amount_mismatch_refresh_cart"
              ? "Your cart total changed. Please refresh your cart and try again."
              : code === "insufficient_stock"
                ? "Some items are out of stock. Please refresh your cart."
                : code === "order_persist_failed"
                  ? (captureResponsePayload?.hint ??
                    "Payment may have succeeded; please contact support.")
                  : "Payment capture failed. You can try again.";
          emitUserError(errorMessage);
          return;
        }
        if (!captureResponsePayload?.ok) {
          emitUserError(
            "Payment was not completed. You can retry checkout now.",
          );
          return;
        }
        if (captureResponsePayload.transactionId) {
          console.info(
            "[paypal] capture transaction",
            captureResponsePayload.transactionId,
          );
        }
        const directOrderId = captureResponsePayload?.order?.id;
        if (
          typeof directOrderId === "number" &&
          Number.isFinite(directOrderId)
        ) {
          onPaid({ orderId: directOrderId });
          return;
        }
        // Webhook-first safety: wait briefly for server-side order/payment reconciliation.
        const persisted = await waitForPersistedOrderId(
          data.orderID,
          captureAttemptIdempotencyKey,
        );
        if (persisted.kind === "failed") {
          if (persisted.reason === "failed_or_cancelled") {
            emitUserError(
              "Payment was not completed. You can retry checkout now.",
            );
            return;
          }
          if (persisted.reason === "timeout") {
            emitUserError(
              "Payment timed out and was auto-cancelled. Please retry checkout.",
            );
            return;
          }
          emitUserError(
            "Payment is still processing on server. Please check My Orders in a moment.",
          );
          return;
        }
        onPaid({ orderId: persisted.orderId });
      },
      onCancel: () => {
        createOrderIdempotencyKeyRef.current = null;
        emitUserError("Payment was cancelled. Your cart is still saved.");
      },
      onError: (error) => {
        // Keep console clean and avoid repeating same message loops.
        const errorMessage =
          error instanceof Error && error.message.trim()
            ? error.message
            : "PayPal reported an error. Try again.";
        emitUserError(errorMessage);
      },
    });
    if (!hostRef.current || hostRef.current !== el || !el.isConnected) return;
    await buttons.render(el);
    if (!hostRef.current || hostRef.current !== el || !el.isConnected) return;
    mountedButtonsRef.current = true;
  }, [disabled, emitUserError, onPaid, shipping, smsTo]);

  // Re-renders buttons when SDK readiness or checkout state changes.
  useEffect(() => {
    if (!sdkReady || disabled) {
      mountedButtonsRef.current = false;
      return;
    }
    void renderButtons().catch((error) => {
      mountedButtonsRef.current = false;
      if (isContainerRemovedError(error)) {
        // Benign race: checkout view changed before PayPal finished mounting.
        return;
      }
      console.error("[PayPal render]", error);
      emitUserError("Could not render PayPal button. Please try again.");
    });
  }, [sdkReady, disabled, renderButtons, emitUserError]);

  return { hostRef, sdkReady };
}
