"use client";

import { usePayPalCheckoutButtons } from "@/app/features/user/hooks";

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
  const { hostRef } = usePayPalCheckoutButtons({
    clientId,
    currencyCode,
    smsTo,
    shipping,
    disabled,
    onPaid,
    onError,
  });

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
