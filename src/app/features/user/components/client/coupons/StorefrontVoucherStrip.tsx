"use client";

import { formatPriceRM } from "@/app/lib/product";
import { useStorefrontVoucherStrip } from "@/app/features/user/hooks";

type Props = {
  cartSubtotal: number;
  appliedCode: string | null | undefined;
  onApplied: () => void;
  busy?: boolean;
  /** `checkout` = tighter vertical layout */
  variant?: "cart" | "checkout";
};

export default function StorefrontVoucherStrip({
  cartSubtotal,
  appliedCode,
  onApplied,
  busy = false,
  variant = "cart",
}: Props) {
  const {
    applying,
    appliedNorm,
    globalScrollState,
    globalStripRef,
    globalVouchers,
    isLoading,
    localErr,
    scrollGlobalStrip,
    scrollUserStrip,
    userScrollState,
    userStripRef,
    userVouchers,
    vouchers,
    applyVoucher,
  } = useStorefrontVoucherStrip({
    cartSubtotal,
    appliedCode,
    onApplied,
    variant,
  });

  if (isLoading && !vouchers.length) {
    return (
      <div
        className={
          variant === "checkout"
            ? "rounded-lg border border-dashed border-gray-200 bg-white/80 px-3 py-2 text-xs text-gray-500"
            : "rounded-xl border border-dashed border-gray-200 bg-amber-50/40 px-4 py-3 text-sm text-gray-600"
        }
      >
        Loading offers…
      </div>
    );
  }

  if (!vouchers.length) {
    return (
      <section
        className={
          variant === "checkout"
            ? "mb-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2"
            : "mb-6 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3"
        }
      >
        <p
          className={
            variant === "checkout"
              ? "text-xs text-gray-600"
              : "text-sm text-gray-600"
          }
        >
          <span className="font-medium text-gray-800">
            No featured vouchers right now.
          </span>{" "}
          If you received a code from the store (email, SMS, social), enter it
          in <strong>Coupons &amp; discounts</strong>
          {variant === "checkout"
            ? " in the promo box below."
            : " under Coupons & discounts in your cart summary."}
        </p>
      </section>
    );
  }

  return (
    <section
      className={
        variant === "checkout"
          ? "rounded-lg border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/80 p-3"
          : "mb-6 inline-block max-w-full rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50/60 p-4 shadow-sm"
      }
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h3
          className={
            variant === "checkout"
              ? "text-xs font-semibold uppercase tracking-wide text-amber-900"
              : "text-sm font-semibold text-amber-950"
          }
        >
          {variant === "checkout" ? "Vouchers" : "Available vouchers"}
        </h3>
        <span className="text-[11px] text-amber-900/70">
          Tap to apply — same as Amazon “clip”
        </span>
      </div>
      {localErr ? (
        <p className="mt-2 text-xs font-medium text-red-700">{localErr}</p>
      ) : null}
      {userVouchers.length > 0 ? (
        <>
          <div className="mt-2 flex items-baseline gap-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              Your vouchers
            </h4>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Scroll vouchers left"
                disabled={!userScrollState.canScrollLeft}
                onClick={() => scrollUserStrip(-1)}
                className="h-7 w-7 rounded-md border border-gray-200 bg-white text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Scroll vouchers right"
                disabled={!userScrollState.canScrollRight}
                onClick={() => scrollUserStrip(1)}
                className="h-7 w-7 rounded-md border border-gray-200 bg-white text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ›
              </button>
            </div>
          </div>
          <div
            className={
              variant === "checkout"
                ? "mt-2 flex gap-2 overflow-x-auto pb-1"
                : "mt-3 flex gap-3 overflow-x-auto pb-1"
            }
            ref={userStripRef}
          >
            {userVouchers.map((v) => {
              const isApplied = appliedNorm === v.code.trim().toUpperCase();
              const canUse = v.meetsMinimumSpend !== false;
              const disabled =
                busy || applying !== null || isApplied || !canUse;
              return (
                <div
                  key={v.code}
                  className={
                    variant === "checkout"
                      ? "flex min-w-[200px] max-w-[240px] shrink-0 flex-col rounded-md border border-amber-200/80 bg-white px-3 py-2 shadow-sm"
                      : "flex min-w-[220px] max-w-[260px] shrink-0 flex-col rounded-lg border border-amber-200 bg-white px-3 py-3 shadow-sm"
                  }
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                    {v.offerLabel}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900">
                    {v.headline ?? v.code}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Your voucher
                  </p>
                  {v.detail ? (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                      {v.detail}
                    </p>
                  ) : null}
                  {v.minOrderSubtotal != null && v.minOrderSubtotal > 0 ? (
                    <p className="mt-1 text-[11px] text-gray-500">
                      Min. order {formatPriceRM(v.minOrderSubtotal)}
                      {v.meetsMinimumSpend === false ? (
                        <span className="ml-1 font-medium text-amber-800">
                          {" "}
                          — add items to qualify
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  {v.endsAt ? (
                    <p className="mt-1 text-[10px] text-gray-400">
                      Ends {new Date(v.endsAt).toLocaleDateString()}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void applyVoucher(v.code)}
                    className={
                      variant === "checkout"
                        ? "mt-2 rounded border border-amber-300 bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                        : "mt-3 rounded-md border border-amber-400 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                    }
                  >
                    {isApplied
                      ? "Applied"
                      : applying === v.code
                        ? "Applying…"
                        : !canUse
                          ? "Not eligible"
                          : "Apply"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {globalVouchers.length > 0 ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              Global coupons
            </h4>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Scroll global coupons left"
                disabled={!globalScrollState.canScrollLeft}
                onClick={() => scrollGlobalStrip(-1)}
                className="h-7 w-7 rounded-md border border-gray-200 bg-white text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Scroll global coupons right"
                disabled={!globalScrollState.canScrollRight}
                onClick={() => scrollGlobalStrip(1)}
                className="h-7 w-7 rounded-md border border-gray-200 bg-white text-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ›
              </button>
            </div>
          </div>
          <div
            className={
              variant === "checkout"
                ? "mt-2 flex gap-2 overflow-x-auto pb-1"
                : "mt-3 flex gap-3 overflow-x-auto pb-1"
            }
            ref={globalStripRef}
          >
            {globalVouchers.map((v) => {
              const isApplied = appliedNorm === v.code.trim().toUpperCase();
              const canUse = v.meetsMinimumSpend !== false;
              const disabled =
                busy || applying !== null || isApplied || !canUse;
              return (
                <div
                  key={v.code}
                  className={
                    variant === "checkout"
                      ? "flex min-w-[200px] max-w-[240px] shrink-0 flex-col rounded-md border border-amber-200/80 bg-white px-3 py-2 shadow-sm"
                      : "flex min-w-[220px] max-w-[260px] shrink-0 flex-col rounded-lg border border-amber-200 bg-white px-3 py-3 shadow-sm"
                  }
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                    {v.offerLabel}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900">
                    {v.headline ?? v.code}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Global
                  </p>
                  {v.detail ? (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                      {v.detail}
                    </p>
                  ) : null}
                  {v.minOrderSubtotal != null && v.minOrderSubtotal > 0 ? (
                    <p className="mt-1 text-[11px] text-gray-500">
                      Min. order {formatPriceRM(v.minOrderSubtotal)}
                      {v.meetsMinimumSpend === false ? (
                        <span className="ml-1 font-medium text-amber-800">
                          {" "}
                          — add items to qualify
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  {v.endsAt ? (
                    <p className="mt-1 text-[10px] text-gray-400">
                      Ends {new Date(v.endsAt).toLocaleDateString()}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void applyVoucher(v.code)}
                    className={
                      variant === "checkout"
                        ? "mt-2 rounded border border-amber-300 bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                        : "mt-3 rounded-md border border-amber-400 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                    }
                  >
                    {isApplied
                      ? "Applied"
                      : applying === v.code
                        ? "Applying…"
                        : !canUse
                          ? "Not eligible"
                          : "Apply"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
