"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import type { CartItemRowData } from "@/app/features/user/types";
import { clearCart, setCartId } from "@/app/redux/store";
import { useUser } from "@/app/features/user/components/client/UserContext";
import {
  useCartCoupon,
  useCheckoutAddresses,
  useShoppingCart,
} from "@/app/features/user/hooks";

type Params = {
  paypalCurrency: string;
};

// Page-level hook: owns checkout orchestration (cart totals, coupon, address prefill, PayPal callbacks, and UI section toggles).
export function useCheckoutPage(params: Params) {
  const { paypalCurrency } = params;

  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useUser();
  const { cart, isLoading, summary, mutate } = useShoppingCart();

  const [paid, setPaid] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [smsTo, setSmsTo] = useState("");

  // UI toggles are deferred slightly to improve perceived performance (avoid rendering heavy sections immediately).
  const [showPayPalButtons, setShowPayPalButtons] = useState(false);
  const [showAddressCards, setShowAddressCards] = useState(false);
  const [showItemLines, setShowItemLines] = useState(false);
  const [showAdvancedSections, setShowAdvancedSections] = useState(false);

  const addresses = useCheckoutAddresses({
    enabled: Boolean(user),
    onError: (message) => setErr(message || null),
  });

  const coupons = useCartCoupon(
    summary.totalPrice,
    Boolean(cart?.items?.length),
  );

  const handlePaid = useCallback(
    (payload: { orderId: number }) => {
      setPaid(true);
      setPaidOrderId(payload.orderId);
      setErr(null);
      // PayPal capture clears the server cart; also clear Redux cart so the header badge resets immediately.
      dispatch(clearCart());
      dispatch(setCartId(""));
      router.push(
        `/features/user/orders/${encodeURIComponent(
          String(payload.orderId),
        )}?payment=success`,
      );
    },
    [dispatch, router],
  );

  const handlePayPalError = useCallback((message: string) => {
    setErr(message);
  }, []);

  const refreshCartAndTotals = useCallback(async () => {
    setErr(null);
    await mutate();
    coupons.invalidateCoupon();
  }, [coupons, mutate]);

  // After a successful payment, scroll to top so confirmation content is visible.
  useEffect(() => {
    if (!paid) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paid]);

  // Defer heavier UI sections for better perceived performance on first paint.
  useEffect(() => {
    const timer = window.setTimeout(() => setShowPayPalButtons(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  // Defer address cards: avoids rendering many inputs during initial hydration.
  useEffect(() => {
    const timer = window.setTimeout(() => setShowAddressCards(true), 220);
    return () => window.clearTimeout(timer);
  }, []);

  // Defer secondary sections (notes/advanced blocks) until after initial render.
  useEffect(() => {
    const timer = window.setTimeout(() => setShowAdvancedSections(true), 260);
    return () => window.clearTimeout(timer);
  }, []);

  const empty = !cart?.items?.length;
  const showInitialLoading = isLoading && !cart;

  const lines = useMemo(() => {
    if (!cart?.items?.length) return [];
    return cart.items.map((i: CartItemRowData) => {
      const unit = i.liveProduct?.price ?? i.price;
      const title = i.liveProduct?.title ?? i.title;
      return { title, qty: i.quantity, unit };
    });
  }, [cart?.items]);

  const stockBlocked = useMemo(() => {
    if (!cart?.items?.length) return false;
    return (cart.items as CartItemRowData[]).some((i) => {
      if (i.liveProduct?.isActive === false) return true;
      const s = i.liveProduct?.stock;
      if (s == null) return false;
      return i.quantity > s || s < 1;
    });
  }, [cart?.items]);

  const dueTotal = coupons.couponQ.data?.total ?? summary.totalPrice;
  const dueDiscount = coupons.couponQ.data?.discountAmount ?? 0;
  const dueCouponCode = coupons.couponQ.data?.applied?.code ?? null;

  return {
    paypalCurrency,
    user,
    cart,
    isLoading,
    summary,
    paid,
    paidOrderId,
    err,
    smsTo,
    setSmsTo,
    empty,
    showInitialLoading,
    showPayPalButtons,
    showAddressCards,
    showItemLines,
    setShowItemLines,
    showAdvancedSections,
    lines,
    stockBlocked,
    handlePaid,
    handlePayPalError,
    refreshCartAndTotals,
    addresses,
    coupons,
    dueTotal,
    dueDiscount,
    dueCouponCode,
  };
}
