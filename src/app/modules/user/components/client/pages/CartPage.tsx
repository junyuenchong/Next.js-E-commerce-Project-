"use client";

/** Cart lines, coupon apply/remove, totals. */
import React, { useCallback, useState } from "react";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { formatPriceRM } from "@/app/lib/format-price";
import CartItemRow from "@/app/modules/user/components/client/Cart/CartItemRow";
import StorefrontVoucherStrip from "@/app/modules/user/components/client/coupons/StorefrontVoucherStrip";
import { useShoppingCart } from "@/app/modules/user/hooks";
import type { CartItemRowData } from "@/app/modules/user/types";

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

  const couponQ = useQuery({
    queryKey: ["checkout-coupon-quote", summary.totalPrice],
    queryFn: async () => {
      const { data } = await http.get<CouponQuote>(
        "/modules/user/api/checkout/coupon",
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
      await http.post("/modules/user/api/checkout/coupon", {
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
      await http.delete("/modules/user/api/checkout/coupon");
      invalidateCoupon();
    } catch (e) {
      setCouponLocalErr(getErrorMessage(e, "Could not remove coupon."));
    } finally {
      setCouponBusy(false);
    }
  }, [invalidateCoupon]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-16 px-4">
          <div className="text-center">
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        {cartActionError ? (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
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

        <StorefrontVoucherStrip
          cartSubtotal={summary.totalPrice}
          appliedCode={couponQ.data?.applied?.code}
          onApplied={invalidateCoupon}
          busy={couponBusy}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">
                  Cart Items ({summary.totalItems})
                </h2>

                <div className="space-y-6">
                  {cart.items.map((item: CartItemRowData) => (
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
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-6">Cart Summary</h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Subtotal ({summary.totalItems} items)
                  </span>
                  <span className="font-medium">
                    {formatPriceRM(
                      couponQ.data?.subtotal ?? summary.totalPrice,
                    )}
                  </span>
                </div>
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

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">
                      {formatPriceRM(couponQ.data?.total ?? summary.totalPrice)}
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
                {couponQ.data?.couponError ? (
                  <p className="mt-2 text-xs text-amber-800">
                    {couponMessage(couponQ.data.couponError)}
                  </p>
                ) : null}
                {couponLocalErr ? (
                  <p className="mt-2 text-xs text-red-700">{couponLocalErr}</p>
                ) : null}
                {couponQ.data?.applied ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
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
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Promo code"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
                      disabled={couponBusy}
                    />
                    <button
                      type="button"
                      disabled={couponBusy}
                      onClick={() => void applyCoupon()}
                      className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Vouchers above apply the same code; it is saved for one hour
                  for PayPal checkout.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href="/modules/user/checkout"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
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
