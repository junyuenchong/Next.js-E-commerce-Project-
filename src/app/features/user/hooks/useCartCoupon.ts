"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { http, getErrorMessage } from "@/app/lib/network";

type CouponQuote = {
  subtotal: number;
  discountAmount: number;
  total: number;
  applied: { code: string } | null;
  couponError?: string;
};

// Stable mapping from API error codes to user-facing messages.
const COUPON_ERR: Record<string, string> = {
  coupon_not_found: "That code is not valid.",
  coupon_inactive: "This code is no longer active.",
  coupon_not_started: "This code is not valid yet.",
  coupon_expired: "This code has expired.",
  coupon_used_up: "This code has reached its usage limit.",
  coupon_min_subtotal: "Order subtotal is below the minimum for this code.",
  coupon_total_too_low: "Discount would make the total too low to pay.",
  invalid_subtotal: "Cart total is invalid.",
  coupon_requires_login: "Sign in to use this voucher.",
  coupon_not_assigned: "This voucher is not available for your account.",
  coupon_already_used: "This voucher was already used.",
};

function couponMessage(code: string | undefined) {
  if (!code) return "Could not apply code.";
  return COUPON_ERR[code] ?? code.replace(/_/g, " ");
}

// Hook boundary: centralizes quote/apply/remove so the cart UI stays presentational.
export function useCartCoupon(totalPrice: number, enabled: boolean) {
  const queryClient = useQueryClient();
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponLocalErr, setCouponLocalErr] = useState<string | null>(null);

  const couponQ = useQuery({
    queryKey: ["checkout-coupon-quote", totalPrice],
    queryFn: async () => {
      const { data } = await http.get<CouponQuote>(
        "/features/user/api/checkout/coupon",
      );
      return data;
    },
    enabled,
    staleTime: 5_000,
  });

  // Refreshes coupon quote and storefront voucher state after mutations.
  const invalidateCoupon = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["checkout-coupon-quote"] });
    void queryClient.invalidateQueries({ queryKey: ["storefront-vouchers"] });
  }, [queryClient]);

  // Applies a coupon code to the checkout session and refreshes derived totals.
  const applyCoupon = useCallback(async () => {
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    setCouponLocalErr(null);
    try {
      await http.post("/features/user/api/checkout/coupon", {
        code: couponInput.trim(),
      });
      setCouponInput("");
      invalidateCoupon();
    } catch (error) {
      const errorMessage = getErrorMessage(error, "apply_failed");
      const axiosLike = error as { response?: { data?: { error?: string } } };
      const code = axiosLike.response?.data?.error;
      setCouponLocalErr(code ? couponMessage(code) : errorMessage);
    } finally {
      setCouponBusy(false);
    }
  }, [couponInput, invalidateCoupon]);

  // Removes the active coupon from checkout and refreshes quote state.
  const removeCoupon = useCallback(async () => {
    setCouponBusy(true);
    setCouponLocalErr(null);
    try {
      await http.delete("/features/user/api/checkout/coupon");
      invalidateCoupon();
    } catch (error) {
      setCouponLocalErr(getErrorMessage(error, "Could not remove coupon."));
    } finally {
      setCouponBusy(false);
    }
  }, [invalidateCoupon]);

  const couponErrorMessage = couponQ.data?.couponError
    ? couponMessage(couponQ.data.couponError)
    : null;

  return {
    couponQ,
    couponInput,
    setCouponInput,
    couponBusy,
    couponLocalErr,
    couponErrorMessage,
    invalidateCoupon,
    applyCoupon,
    removeCoupon,
  };
}
