"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import type { SavedAddress } from "@/app/features/user/components/client/profile/AddressBookSection";
import { useUser } from "@/app/features/user/components/client/UserContext";
import { useShoppingCart } from "@/app/features/user/hooks";
import { formatPriceRM } from "@/app/lib/format-price";
import type { CartItemRowData } from "@/app/features/user/types";

const PayPalCheckoutButtons = dynamic(
  () =>
    import("@/app/features/user/components/client/Checkout/PayPalCheckoutButtons"),
  { ssr: false },
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

type CheckoutProps = {
  paypalClientId: string;
  paypalCurrency: string;
};

async function fetchAddresses(): Promise<SavedAddress[]> {
  const { data } = await http.get<{ addresses: SavedAddress[] }>(
    "/features/user/api/addresses",
  );
  return data.addresses ?? [];
}

type CouponQuote = {
  subtotal: number;
  discountAmount: number;
  total: number;
  applied: { code: string } | null;
  couponError?: string;
};

const CHECKOUT_COUPON_ERR: Record<string, string> = {
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

function checkoutCouponMessage(err: string | undefined) {
  if (!err) return "Could not apply code.";
  return CHECKOUT_COUPON_ERR[err] ?? err.replace(/_/g, " ");
}

export default function Checkout({
  paypalClientId,
  paypalCurrency,
}: CheckoutProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useUser();
  const { cart, isLoading, summary, mutate } = useShoppingCart();

  const refreshCheckoutCoupon = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["checkout-coupon-quote"] });
    void qc.invalidateQueries({ queryKey: ["storefront-vouchers"] });
  }, [qc]);

  const [paid, setPaid] = useState(false);
  const [paidOrderId, setPaidOrderId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [smsTo, setSmsTo] = useState("");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("Malaysia");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [shippingPrefilled, setShippingPrefilled] = useState(false);
  const [selectedSavedId, setSelectedSavedId] = useState<number | "">("");
  const [promoInput, setPromoInput] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoLocalErr, setPromoLocalErr] = useState<string | null>(null);
  const [showPayPalButtons, setShowPayPalButtons] = useState(false);
  const [showAddressCards, setShowAddressCards] = useState(false);
  const [showItemLines, setShowItemLines] = useState(false);
  const [showAdvancedSections, setShowAdvancedSections] = useState(false);

  const { data: savedAddresses = [], isSuccess: addressesLoaded } = useQuery({
    queryKey: ["user-addresses"],
    queryFn: fetchAddresses,
    enabled: Boolean(user),
  });

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

  const applyPromoCode = useCallback(async () => {
    if (!promoInput.trim()) return;
    setPromoBusy(true);
    setPromoLocalErr(null);
    try {
      await http.post("/features/user/api/checkout/coupon", {
        code: promoInput.trim(),
      });
      setPromoInput("");
      refreshCheckoutCoupon();
    } catch (e) {
      const ax = e as { response?: { data?: { error?: string } } };
      const code = ax.response?.data?.error;
      setPromoLocalErr(
        code ? checkoutCouponMessage(code) : getErrorMessage(e, "apply_failed"),
      );
    } finally {
      setPromoBusy(false);
    }
  }, [promoInput, refreshCheckoutCoupon]);

  const removePromoCode = useCallback(async () => {
    setPromoBusy(true);
    setPromoLocalErr(null);
    try {
      await http.delete("/features/user/api/checkout/coupon");
      refreshCheckoutCoupon();
    } catch (e) {
      setPromoLocalErr(getErrorMessage(e, "Could not remove coupon."));
    } finally {
      setPromoBusy(false);
    }
  }, [refreshCheckoutCoupon]);

  useEffect(() => {
    if (!user || !addressesLoaded || shippingPrefilled) return;
    if (savedAddresses.length) {
      const def = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
      setLine1(def.line1);
      setCity(def.city);
      setPostcode(def.postcode);
      setCountry(def.country);
      setSelectedSavedId(def.id);
    }
    setShippingPrefilled(true);
  }, [user, savedAddresses, addressesLoaded, shippingPrefilled]);

  const applySavedAddress = useCallback(
    (id: number | "") => {
      setSelectedSavedId(id);
      if (id === "") return;
      const a = savedAddresses.find((x) => x.id === id);
      if (a) {
        setLine1(a.line1);
        setCity(a.city);
        setPostcode(a.postcode);
        setCountry(a.country);
      }
    },
    [savedAddresses],
  );

  const setDefaultSavedAddress = useCallback(
    async (id: number) => {
      setErr(null);
      try {
        await http.patch(`/features/user/api/addresses/${id}`, {
          isDefault: true,
        });
        void qc.invalidateQueries({ queryKey: ["user-addresses"] });
      } catch (e) {
        setErr(getErrorMessage(e, "Could not set default address."));
      }
    },
    [qc],
  );

  const handlePaid = useCallback(
    (payload: { orderId: number }) => {
      setPaid(true);
      setPaidOrderId(payload.orderId);
      setErr(null);
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    if (!paid) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paid]);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowPayPalButtons(true), 180);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowAddressCards(true), 220);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setShowAdvancedSections(true), 260);
    return () => window.clearTimeout(timer);
  }, []);

  const handlePayPalError = useCallback((message: string) => {
    setErr(message);
  }, []);

  const refreshCartAndTotals = useCallback(async () => {
    setErr(null);
    await mutate();
    refreshCheckoutCoupon();
  }, [mutate, refreshCheckoutCoupon]);

  const empty = !cart?.items?.length;
  const showInitialLoading = isLoading && !cart;

  const shippingPayload = useMemo(() => {
    if (!line1.trim() || !city.trim() || !postcode.trim() || !country.trim()) {
      return undefined;
    }
    return {
      line1: line1.trim(),
      city: city.trim(),
      postcode: postcode.trim(),
      country: country.trim(),
      method: shippingMethod,
    };
  }, [line1, city, postcode, country, shippingMethod]);

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

  if (showInitialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
            <p className="mt-1 text-xs text-gray-600">
              Preparing your checkout details...
            </p>
          </div>
          <div className="h-52 animate-pulse rounded-lg bg-white shadow-sm" />
          <div className="h-24 animate-pulse rounded-lg bg-white shadow-sm" />
          <div className="h-64 animate-pulse rounded-lg bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  if (!showInitialLoading && empty) {
    return (
      <div className="min-h-screen bg-gray-50 py-16 px-4 text-center">
        <p className="text-gray-700 mb-6">Your cart is empty.</p>
        <Link
          href="/features/user/cart"
          className="text-blue-600 font-medium hover:underline"
        >
          Back to cart
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-sm text-gray-600 mt-1">
            Pay with PayPal (sandbox). You will be charged{" "}
            <strong>
              {formatPriceRM(couponQ.data?.total ?? summary.totalPrice)}
            </strong>{" "}
            {paypalCurrency}
            {couponQ.data && couponQ.data.discountAmount > 0 ? (
              <span className="text-emerald-700">
                {" "}
                (includes {formatPriceRM(couponQ.data.discountAmount)} discount
                {couponQ.data.applied ? ` · ${couponQ.data.applied.code}` : ""})
              </span>
            ) : null}
            .
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900">Items</h2>
            <button
              type="button"
              onClick={() => setShowItemLines((v) => !v)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              {showItemLines ? "Hide items" : `Show items (${lines.length})`}
            </button>
          </div>
          {!showItemLines ? (
            <p className="text-xs text-gray-600">
              Item details are collapsed to keep checkout fast. Expand to review
              each line.
            </p>
          ) : (
            <ul className="text-sm text-gray-700 divide-y divide-gray-100">
              {lines.map(
                (
                  l: { title: string; qty: number; unit: number },
                  idx: number,
                ) => (
                  <li key={idx} className="py-2 flex justify-between gap-4">
                    <span>
                      {l.title} <span className="text-gray-500">×{l.qty}</span>
                    </span>
                    <span className="shrink-0">
                      {formatPriceRM(l.unit * l.qty)}
                    </span>
                  </li>
                ),
              )}
            </ul>
          )}
          {couponQ.data && couponQ.data.discountAmount > 0 ? (
            <div className="flex justify-between text-sm text-emerald-800">
              <span>Discount</span>
              <span>−{formatPriceRM(couponQ.data.discountAmount)}</span>
            </div>
          ) : null}
          {couponQ.data?.couponError ? (
            <p className="text-xs text-amber-800">
              Coupon was cleared: adjust your cart or re-apply a code on the
              cart page.
            </p>
          ) : null}
          <div className="flex justify-between font-semibold border-t pt-3">
            <span>Total due</span>
            <span className="text-blue-600">
              {formatPriceRM(couponQ.data?.total ?? summary.totalPrice)}
            </span>
          </div>
        </div>

        <div className="min-h-[88px]">
          <StorefrontVoucherStrip
            cartSubtotal={summary.totalPrice}
            appliedCode={couponQ.data?.applied?.code}
            onApplied={refreshCheckoutCoupon}
            busy={promoBusy}
            variant="checkout"
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Promo / coupon code
          </h3>
          <div className="mt-1 min-h-[20px]">
            <p className="text-xs text-gray-600">
              For codes from email or social that are not shown as vouchers
              above.
            </p>
          </div>
          <div className="mt-2 min-h-[20px]">
            {promoLocalErr ? (
              <p className="text-xs text-red-700">{promoLocalErr}</p>
            ) : null}
          </div>
          {couponQ.data?.applied ? (
            <div className="mt-3 flex min-h-[40px] flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-700">
                Applied:{" "}
                <span className="font-mono font-medium">
                  {couponQ.data.applied.code}
                </span>
              </p>
              <button
                type="button"
                disabled={promoBusy}
                onClick={() => void removePromoCode()}
                className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="mt-3 flex min-h-[40px] flex-col gap-2 sm:flex-row">
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Enter code"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
                disabled={promoBusy}
              />
              <button
                type="button"
                disabled={promoBusy}
                onClick={() => void applyPromoCode()}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {showAdvancedSections ? (
          <>
            <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Shipping</h2>
              <p className="text-xs text-gray-500">
                Enter your address so we can attach it to your order record
                (recommended).
              </p>
              {user && savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-gray-900">
                      Saved addresses
                    </div>
                    <Link
                      href="/features/user/profile"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Manage →
                    </Link>
                  </div>

                  {showAddressCards ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => applySavedAddress("")}
                        className={`text-left rounded-xl border p-4 transition ${
                          selectedSavedId === ""
                            ? "border-emerald-600 ring-2 ring-emerald-100 bg-emerald-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold text-gray-900">
                            Enter manually
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-600">
                          Type a new address below (won&apos;t be saved
                          automatically).
                        </div>
                      </button>

                      {savedAddresses.map((a) => {
                        const active = selectedSavedId === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => applySavedAddress(a.id)}
                            className={`text-left rounded-xl border p-4 transition ${
                              active
                                ? "border-emerald-600 ring-2 ring-emerald-100 bg-emerald-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {a.label?.trim() || "Address"}
                                  </div>
                                  {a.isDefault ? (
                                    <span className="shrink-0 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white">
                                      Default
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-xs text-gray-700">
                                  <div className="truncate">{a.line1}</div>
                                  <div className="truncate">
                                    {[a.postcode, a.city]
                                      .filter(Boolean)
                                      .join(" ")}
                                  </div>
                                  <div className="truncate">{a.country}</div>
                                </div>
                              </div>

                              {!a.isDefault ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void setDefaultSavedAddress(a.id);
                                  }}
                                  className="shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-800 hover:bg-gray-50"
                                >
                                  Set default
                                </button>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
                      <div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
                    </div>
                  )}

                  <p className="text-[11px] text-gray-500">
                    Tap a card to use it for this checkout. “Default” is
                    auto-selected next time.
                  </p>
                </div>
              )}
              {user && savedAddresses.length === 0 && shippingPrefilled && (
                <p className="text-xs text-gray-500">
                  <Link
                    href="/features/user/profile"
                    className="text-blue-600 hover:underline"
                  >
                    Save addresses on your profile
                  </Link>{" "}
                  to fill checkout faster next time.
                </p>
              )}
              <label className="block text-sm text-gray-800">
                Address line
                <input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  autoComplete="street-address"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm text-gray-800">
                  City
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm text-gray-800">
                  Postcode
                  <input
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block text-sm text-gray-800">
                Country
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm text-gray-800">
                Shipping method
                <select
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="standard">Standard delivery</option>
                  <option value="express">Express delivery</option>
                  <option value="pickup">Store pickup</option>
                </select>
              </label>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5 space-y-3">
              <label className="block text-sm font-medium text-gray-800">
                SMS receipt (optional, E.164 e.g. +60123456789)
                <input
                  type="tel"
                  value={smsTo}
                  onChange={(e) => setSmsTo(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="+60…"
                  autoComplete="tel"
                />
              </label>
              <p className="text-xs text-gray-500">
                Email receipt is sent automatically when you are signed in
                (session email).
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="h-72 animate-pulse rounded-lg bg-white shadow-sm" />
            <div className="h-28 animate-pulse rounded-lg bg-white shadow-sm" />
          </div>
        )}

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
            <p>{err}</p>
            <button
              type="button"
              onClick={() => void refreshCartAndTotals()}
              className="inline-flex rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Refresh cart & totals
            </button>
          </div>
        )}

        {stockBlocked ? (
          <div
            role="alert"
            className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2"
          >
            <p>
              One or more items are out of stock, unavailable, or exceed current
              inventory. Update your cart, then return to checkout.
            </p>
            <Link
              href="/features/user/cart"
              className="inline-block font-medium text-blue-700 hover:underline"
            >
              Go to cart
            </Link>
          </div>
        ) : null}

        {paid ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M20 7L9 18L4 13"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="absolute -inset-4 -z-10 rounded-3xl bg-emerald-50" />
              </div>

              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Payment successful
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Thanks! Your order is confirmed and we&apos;re preparing it now.
              </p>

              <div className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-900">Order</div>
                  <div className="font-mono text-sm font-semibold text-gray-900">
                    {paidOrderId ? `#${paidOrderId}` : "—"}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatPriceRM(couponQ.data?.total ?? summary.totalPrice)}{" "}
                    {paypalCurrency}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-600">Receipt email</div>
                  <div className="text-sm text-gray-900 truncate max-w-[220px] text-right">
                    {user?.email ?? "Sent after sign-in"}
                  </div>
                </div>
              </div>

              <div className="mt-5 w-full grid gap-2 sm:grid-cols-2">
                {paidOrderId ? (
                  <Link
                    href={`/features/user/orders/${paidOrderId}`}
                    className="inline-flex justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
                  >
                    View order details
                  </Link>
                ) : (
                  <Link
                    href="/features/user/orders"
                    className="inline-flex justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
                  >
                    View my orders
                  </Link>
                )}
                <Link
                  href="/features/user"
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  Continue shopping
                </Link>
              </div>

              <div className="mt-5 w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left">
                <div className="text-sm font-semibold text-emerald-950">
                  Next steps
                </div>
                <ul className="mt-2 text-sm text-emerald-900 space-y-1 list-disc pl-5">
                  <li>Check your email for the receipt (if signed in).</li>
                  <li>Track updates in “My orders”.</li>
                  <li>
                    Need help? Use the chat bubble and mention your order
                    number.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <>
            {showPayPalButtons ? (
              <PayPalCheckoutButtons
                clientId={paypalClientId}
                currencyCode={paypalCurrency}
                smsTo={smsTo.trim() || undefined}
                shipping={shippingPayload}
                disabled={stockBlocked}
                onPaid={handlePaid}
                onError={handlePayPalError}
              />
            ) : (
              <div className="h-20 animate-pulse rounded-lg bg-white shadow-sm" />
            )}
          </>
        )}

        <Link
          href="/features/user/cart"
          className="inline-block text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to cart
        </Link>
      </div>
    </div>
  );
}
