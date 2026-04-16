// Feature: Implements coupon validation, discount math, and admin coupon management services.
import type {
  Coupon,
  CouponDiscountType,
  CouponRedemptionScope,
  Prisma,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "@/app/lib/prisma";
import { moneyToNumber } from "@/backend/core/money";

export const MIN_PAYPAL_CHARGE = 0.01;

export function normalizeCouponCode(raw: string): string {
  // Guard: canonicalize code to avoid case/whitespace mismatches.
  return raw.trim().toUpperCase();
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type ResolvedCheckoutCoupon =
  | {
      ok: true;
      couponId: number | null;
      codeSnapshot: string | null;
      discountAmount: number;
      total: number;
    }
  | { ok: false; error: string };

// Note: checkout pricing helpers (cart + PayPal).

// Feature: resolve checkout totals and coupon snapshots for capture validation.
export async function resolveCheckoutCouponPricing(args: {
  subtotal: number;
  couponCode: string | null | undefined;
  // Guard: storefront numeric user id is required for targeted vouchers.
  userId?: number | null;
}): Promise<ResolvedCheckoutCoupon> {
  // Feature: central pricing resolver is source of truth for checkout and capture.
  const subtotal = roundMoney(args.subtotal);
  if (!(subtotal >= MIN_PAYPAL_CHARGE))
    return { ok: false, error: "invalid_subtotal" };

  const normalized = args.couponCode?.trim()
    ? normalizeCouponCode(args.couponCode)
    : null;
  if (!normalized) {
    return {
      ok: true,
      couponId: null,
      codeSnapshot: null,
      discountAmount: 0,
      total: subtotal,
    };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalized },
  });
  if (!coupon) return { ok: false, error: "coupon_not_found" };

  const scopeErr = await validateCouponRedemptionScope(
    coupon.redemptionScope,
    coupon.id,
    args.userId ?? null,
  );
  if (scopeErr) return { ok: false, error: scopeErr };

  const err = validateCouponForSubtotal(coupon, subtotal, new Date());
  if (err) return { ok: false, error: err };

  const discountAmount = computeDiscountAmount(subtotal, coupon);
  const total = roundMoney(subtotal - discountAmount);
  if (total < MIN_PAYPAL_CHARGE)
    return { ok: false, error: "coupon_total_too_low" };

  return {
    ok: true,
    couponId: coupon.id,
    codeSnapshot: coupon.code,
    discountAmount,
    total,
  };
}

async function validateCouponRedemptionScope(
  scope: CouponRedemptionScope,
  couponId: number,
  userId: number | null,
): Promise<string | null> {
  // Guard: targeted vouchers require authenticated assigned users with unused rows.
  if (scope !== "ASSIGNED_USERS") return null;
  if (!userId) return "coupon_requires_login";
  const a = await prisma.userCouponAssignment.findUnique({
    where: { userId_couponId: { userId, couponId } },
    select: { usedAt: true },
  });
  if (!a) return "coupon_not_assigned";
  if (a.usedAt) return "coupon_already_used";
  return null;
}

// Guard: validate coupon schedule and usage only (no minimum spend check).
export function validateCouponWindow(
  coupon: Pick<
    Coupon,
    "isActive" | "startsAt" | "endsAt" | "usageLimit" | "usedCount"
  >,
  now: Date,
): string | null {
  // Feature: window checks are shared by storefront display and checkout apply flow.
  if (!coupon.isActive) return "coupon_inactive";
  if (coupon.startsAt && now < coupon.startsAt) return "coupon_not_started";
  if (coupon.endsAt && now > coupon.endsAt) return "coupon_expired";
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return "coupon_used_up";
  }
  return null;
}

// Guard: return error code or null when coupon is valid for subtotal/time.
export function validateCouponForSubtotal(
  coupon: Pick<
    Coupon,
    | "isActive"
    | "startsAt"
    | "endsAt"
    | "usageLimit"
    | "usedCount"
    | "minOrderSubtotal"
  >,
  subtotal: number,
  now: Date,
): string | null {
  const w = validateCouponWindow(coupon, now);
  if (w) return w;
  const minSub =
    coupon.minOrderSubtotal != null
      ? moneyToNumber(coupon.minOrderSubtotal)
      : null;
  if (minSub != null && subtotal < minSub) return "coupon_min_subtotal";
  return null;
}

export function formatCouponOfferLabel(
  coupon: Pick<Coupon, "discountType" | "value">,
): string {
  const val = moneyToNumber(coupon.value);
  if (coupon.discountType === "PERCENT") {
    const s = Number.isInteger(val) ? String(val) : val.toFixed(2);
    return `${s}% off order`;
  }
  return `RM ${val.toFixed(2)} off order`;
}

export type StorefrontVoucherPublic = {
  code: string;
  headline: string | null;
  detail: string | null;
  offerLabel: string;
  minOrderSubtotal: number | null;
  endsAt: string | null;
  meetsMinimumSpend: boolean | null;
};

// Feature: list active coupons flagged for storefront voucher strip (cart/checkout).
export async function listStorefrontVouchersPublicService(opts?: {
  subtotal?: number | null;
}): Promise<StorefrontVoucherPublic[]> {
  const now = new Date();
  const rows = await prisma.coupon.findMany({
    where: {
      isActive: true,
      showOnStorefront: true,
      redemptionScope: "PUBLIC",
    },
    orderBy: [{ updatedAt: "desc" }],
  });
  const sub = opts?.subtotal;
  const out: StorefrontVoucherPublic[] = [];
  for (const c of rows) {
    if (validateCouponWindow(c, now)) continue;
    const minSub =
      c.minOrderSubtotal != null ? moneyToNumber(c.minOrderSubtotal) : null;
    const meetsMinimumSpend =
      sub == null || !Number.isFinite(sub)
        ? null
        : minSub == null || sub >= minSub;
    out.push({
      code: c.code,
      headline: c.voucherHeadline?.trim() || null,
      detail: c.description?.trim() || null,
      offerLabel: formatCouponOfferLabel(c),
      minOrderSubtotal: minSub,
      endsAt: c.endsAt?.toISOString() ?? null,
      meetsMinimumSpend,
    });
  }
  return out;
}

export function computeDiscountAmount(
  subtotal: number,
  coupon: Pick<Coupon, "discountType" | "value" | "maxDiscount">,
): number {
  // Guard: clamp discount so final charge never drops below PayPal minimum.
  const val = moneyToNumber(coupon.value);
  let discount =
    coupon.discountType === "PERCENT" ? (subtotal * val) / 100 : val;
  if (coupon.discountType === "PERCENT" && coupon.maxDiscount != null) {
    const cap = moneyToNumber(coupon.maxDiscount);
    if (discount > cap) discount = cap;
  }
  discount = roundMoney(Math.max(0, discount));
  const maxOff = roundMoney(subtotal - MIN_PAYPAL_CHARGE);
  return Math.min(discount, maxOff);
}

function toDecimal(n: number): Decimal {
  return new Decimal(n.toFixed(2));
}

// Note: admin coupon management helpers.

// Feature: list coupons for admin management UI.
export async function listCouponsAdminService() {
  return prisma.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
}

// Feature: create coupon from admin input with normalization applied.
export async function createCouponAdminService(data: {
  code: string;
  description?: string | null;
  discountType: CouponDiscountType;
  value: number;
  minOrderSubtotal?: number | null;
  maxDiscount?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  usageLimit?: number | null;
  isActive?: boolean;
  redemptionScope?: CouponRedemptionScope;
  showOnStorefront?: boolean;
  voucherHeadline?: string | null;
}) {
  // Note: admin create normalizes code/decimals to keep persistence deterministic.
  const code = normalizeCouponCode(data.code);
  return prisma.coupon.create({
    data: {
      code,
      description: data.description?.trim() || null,
      discountType: data.discountType,
      value: toDecimal(data.value),
      minOrderSubtotal:
        data.minOrderSubtotal != null ? toDecimal(data.minOrderSubtotal) : null,
      maxDiscount:
        data.maxDiscount != null ? toDecimal(data.maxDiscount) : null,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      usageLimit: data.usageLimit ?? null,
      isActive: data.isActive ?? true,
      redemptionScope: data.redemptionScope ?? "PUBLIC",
      showOnStorefront: data.showOnStorefront ?? false,
      voucherHeadline: data.voucherHeadline?.trim() || null,
    },
  });
}

// Feature: update coupon from admin input.
export async function updateCouponAdminService(
  id: number,
  data: Prisma.CouponUpdateInput,
) {
  return prisma.coupon.update({ where: { id }, data });
}

// Guard: deactivate coupon so it no longer applies at checkout.
export async function deactivateCouponAdminService(id: number) {
  return prisma.coupon.update({
    where: { id },
    data: { isActive: false },
  });
}
