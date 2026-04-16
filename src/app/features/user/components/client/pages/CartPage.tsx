"use client";

/** Cart lines, coupon apply/remove, totals. */
import React, { useCallback, useState } from "react";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { formatPriceRM } from "@/app/lib/format-price";
import { useShoppingCart } from "@/app/features/user/hooks";
import type { CartItemRowData } from "@/app/features/user/types";

const CartItemRow = dynamic(
  () => import("@/app/features/user/components/client/Cart/CartItemRow"),
  {
    loading: () => (
      <div className="h-28 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
    ),
  },
);
const StorefrontVoucherStrip = dynamic(
  () =>
    import("@/app/features/user/components/client/coupons/StorefrontVoucherStrip"),
  {
    loading: () => (
      <div className="h-[88px] animate-pulse rounded-lg bg-white shadow-sm" />
    ),
  },
);

type CouponQuote = {
  subtotal: number;
  discountAmount: number;
  total: number;
  applied: { code: string } | null;
  couponError?: string;
};

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

function couponMessage(err: string | undefined) {
  if (!err) return "Could not apply code.";
  return COUPON_ERR[err] ?? err.replace(/_/g, " ");
}

const CartPage = () => {
  const qc = useQueryClient();
  const {
    cart,
    isLoading,
    summary,
    updateQuantity,
    removeItem,
    clearCart,
    cartActionError,
    clearCartActionError,
  } = useShoppingCart();

  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponLocalErr, setCouponLocalErr] = useState<string | null>(null);
  const cartItems = cart?.items ?? [];
  const showInitialLoading = isLoading && !cart;
  const showSkeleton = isLoading && cartItems.length === 0;

  const couponQ = useQuery({
    queryKey: ["checkout-coupon-quote", summary.totalPrice],
    queryFn: async () => {
      const { data } = await http.get<CouponQuote>(
        "/features/user/api/checkout/coupon",
      );
      return data;
    },
    enabled: Boolean(cart?.items?.length),
    staleTime: 5_000,
  });

  const invalidateCoupon = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["checkout-coupon-quote"] });
    void qc.invalidateQueries({ queryKey: ["storefront-vouchers"] });
  }, [qc]);

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
    } catch (e) {
      const msg = getErrorMessage(e, "apply_failed");
      try {
        const ax = e as { response?: { data?: { error?: string } } };
        const code = ax.response?.data?.error;
        setCouponLocalErr(code ? couponMessage(code) : msg);
      } catch {
        setCouponLocalErr(msg);
      }
    } finally {
      setCouponBusy(false);
    }
  }, [couponInput, invalidateCoupon]);

  const removeCoupon = useCallback(async () => {
    setCouponBusy(true);
    setCouponLocalErr(null);
    try {
      await http.delete("/features/user/api/checkout/coupon");
      invalidateCoupon();
    } catch (e) {
      setCouponLocalErr(getErrorMessage(e, "Could not remove coupon."));
    } finally {
      setCouponBusy(false);
    }
  }, [invalidateCoupon]);

  if (showInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="min-h-[320px]">
              <ShoppingCart className="mx-auto mb-6 h-24 w-24 text-gray-300" />
              <h1 className="mb-4 text-3xl font-bold text-gray-900">
                Your cart
              </h1>
              <p className="mb-8 text-sm text-gray-600">Loading your cart...</p>
              <div className="mx-auto h-11 w-52 animate-pulse rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="min-h-[320px]">
              <ShoppingCart className="mx-auto h-24 w-24 text-gray-400 mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Your cart is empty
              </h1>
              <p className="text-gray-600 mb-8">
                Looks like you haven&apos;t added any items to your cart yet.
              </p>
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review your items and complete checkout.
            </p>
          </div>
        </div>

        <div className="mb-6 min-h-[52px]">
          {cartActionError ? (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span>{cartActionError}</span>
              <button
                type="button"
                onClick={clearCartActionError}
                className="shrink-0 font-medium text-red-700 underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>

        <div className="mb-6 min-h-[88px]">
          {showSkeleton ? (
            <div className="h-[88px] animate-pulse rounded-lg bg-white shadow-sm" />
          ) : (
            <StorefrontVoucherStrip
              cartSubtotal={summary.totalPrice}
              appliedCode={couponQ.data?.applied?.code}
              onApplied={invalidateCoupon}
              busy={couponBusy}
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="min-h-[520px] bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">
                  Cart Items ({showSkeleton ? "…" : summary.totalItems})
                </h2>

                <div className="min-h-[360px] space-y-6">
                  {showSkeleton
                    ? Array.from({ length: 3 }).map((_, idx) => (
                        <div
                          key={`cart-skeleton-${idx}`}
                          className="h-28 animate-pulse rounded-lg border border-gray-200 bg-gray-50"
                        />
                      ))
                    : cartItems.map((item: CartItemRowData) => (
                        <CartItemRow
                          key={item.id}
                          item={item}
                          formatPrice={formatPriceRM}
                          onDecrease={(productId, quantity) =>
                            updateQuantity(productId, quantity - 1)
                          }
                          onIncrease={(productId, quantity) =>
                            updateQuantity(productId, quantity + 1)
                          }
                          onRemove={removeItem}
                        />
                      ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 min-h-[520px] bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Cart Summary</h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Subtotal ({showSkeleton ? "…" : summary.totalItems} items)
                  </span>
                  <span className="font-medium">
                    {showSkeleton ? (
                      <span className="inline-block h-5 w-24 animate-pulse rounded bg-gray-200" />
                    ) : (
                      formatPriceRM(
                        couponQ.data?.subtotal ?? summary.totalPrice,
                      )
                    )}
                  </span>
                </div>
                <div className="min-h-[24px]">
                  {couponQ.data && couponQ.data.discountAmount > 0 ? (
                    <div className="flex justify-between text-emerald-700">
                      <span>
                        Discount
                        {couponQ.data.applied
                          ? ` (${couponQ.data.applied.code})`
                          : ""}
                      </span>
                      <span className="font-medium">
                        −{formatPriceRM(couponQ.data.discountAmount)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">
                      {showSkeleton ? (
                        <span className="inline-block h-6 w-24 animate-pulse rounded bg-gray-200" />
                      ) : (
                        formatPriceRM(couponQ.data?.total ?? summary.totalPrice)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  Coupons &amp; discounts
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  Got a code from email, SMS, or social? Enter it here—even when
                  it is not shown in “Available vouchers” above.
                </p>
                <div className="mt-2 min-h-[36px]">
                  {couponQ.data?.couponError ? (
                    <p className="text-xs text-amber-800">
                      {couponMessage(couponQ.data.couponError)}
                    </p>
                  ) : null}
                  {couponLocalErr ? (
                    <p className="text-xs text-red-700">{couponLocalErr}</p>
                  ) : null}
                </div>
                <div className="mt-3 min-h-[42px]">
                  {couponQ.data?.applied ? (
                    <div className="flex min-h-[42px] flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-gray-700">
                        Applied:{" "}
                        <span className="font-mono font-medium">
                          {couponQ.data.applied.code}
                        </span>
                      </p>
                      <button
                        type="button"
                        disabled={couponBusy}
                        onClick={() => void removeCoupon()}
                        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex min-h-[42px] flex-col gap-2 sm:flex-row">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Promo code"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
                        disabled={couponBusy || showSkeleton}
                      />
                      <button
                        type="button"
                        disabled={couponBusy || showSkeleton}
                        onClick={() => void applyCoupon()}
                        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Vouchers above apply the same code; it is saved for one hour
                  for PayPal checkout.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href="/features/user/checkout"
                  className={`w-full inline-flex items-center justify-center px-6 py-3 font-medium rounded-lg transition-colors ${
                    showSkeleton
                      ? "bg-emerald-300 text-white pointer-events-none"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  Checkout with PayPal
                </Link>
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue Shopping
                </Link>
                <button
                  type="button"
                  onClick={clearCart}
                  className="w-full inline-flex items-center justify-center px-6 py-3 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
