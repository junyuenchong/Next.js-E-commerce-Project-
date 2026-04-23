"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { http, getErrorMessage } from "@/app/lib/network";
import { useUser } from "@/app/features/user/components/client/UserContext";

export type StorefrontVoucherDto = {
  code: string;
  headline: string | null;
  detail: string | null;
  offerLabel: string;
  minOrderSubtotal: number | null;
  endsAt: string | null;
  meetsMinimumSpend: boolean | null;
  scope?: "USER" | "GLOBAL";
};

type ScrollState = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

// Maps stable backend error codes to UX-friendly messages.
const COUPON_ERR: Record<string, string> = {
  coupon_not_found: "Invalid code.",
  coupon_inactive: "No longer active.",
  coupon_not_started: "Not valid yet.",
  coupon_expired: "Expired.",
  coupon_used_up: "Fully redeemed.",
  coupon_min_subtotal: "Minimum spend not met.",
  coupon_total_too_low: "Discount too high for this cart.",
};

function useHorizontalStripState(
  itemCount: number,
  variant: "cart" | "checkout",
) {
  // UI-only helper: track scroll boundaries for arrow button state.
  const ref = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const canScrollLeft = el.scrollLeft > 0;
      const canScrollRight =
        el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setScrollState({ canScrollLeft, canScrollRight });
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    return () => el.removeEventListener("scroll", update);
  }, [itemCount, variant]);

  const scrollByCard = useCallback((dir: -1 | 1) => {
    ref.current?.scrollBy({
      left: dir * 280,
      behavior: "smooth",
    });
  }, []);

  return { ref, scrollState, scrollByCard };
}

export function useStorefrontVoucherStrip(params: {
  cartSubtotal: number;
  appliedCode: string | null | undefined;
  onApplied: () => void;
  variant?: "cart" | "checkout";
}) {
  // Page-level hook: owns fetch + apply side effects, components only render.
  const { cartSubtotal, appliedCode, onApplied, variant = "cart" } = params;
  const { user } = useUser();
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [
      "storefront-vouchers",
      cartSubtotal,
      user?.id != null ? String(user.id) : "anon",
    ],
    queryFn: async () => {
      const { data: body } = await http.get<{
        vouchers: StorefrontVoucherDto[];
      }>(
        `/features/user/api/coupons/vouchers?subtotal=${encodeURIComponent(
          String(cartSubtotal),
        )}`,
      );
      return body.vouchers ?? [];
    },
    staleTime: 30_000,
  });

  // Keep a stable array reference for memo dependencies.
  const vouchers = useMemo(() => data ?? [], [data]);
  const userVouchers = useMemo(
    () => vouchers.filter((voucher) => voucher.scope === "USER"),
    [vouchers],
  );
  const globalVouchers = useMemo(
    () => vouchers.filter((voucher) => voucher.scope !== "USER"),
    [vouchers],
  );
  const appliedNorm = useMemo(
    () => (appliedCode ? appliedCode.trim().toUpperCase() : ""),
    [appliedCode],
  );

  const userStrip = useHorizontalStripState(userVouchers.length, variant);
  const globalStrip = useHorizontalStripState(globalVouchers.length, variant);

  const applyVoucher = useCallback(
    async (code: string) => {
      setLocalErr(null);
      setApplying(code);
      try {
        await http.post("/features/user/api/checkout/coupon", { code });
        onApplied();
      } catch (error) {
        const axiosLike = error as { response?: { data?: { error?: string } } };
        const codeErr = axiosLike.response?.data?.error;
        setLocalErr(
          codeErr && COUPON_ERR[codeErr]
            ? COUPON_ERR[codeErr]
            : getErrorMessage(error, "Could not apply voucher."),
        );
      } finally {
        setApplying(null);
      }
    },
    [onApplied],
  );

  return {
    applying,
    appliedNorm,
    globalStripRef: globalStrip.ref,
    globalScrollState: globalStrip.scrollState,
    globalVouchers,
    isLoading,
    localErr,
    scrollGlobalStrip: globalStrip.scrollByCard,
    scrollUserStrip: userStrip.scrollByCard,
    userStripRef: userStrip.ref,
    userScrollState: userStrip.scrollState,
    userVouchers,
    vouchers,
    applyVoucher,
  };
}
