// implements coupon validation, discount math, and admin coupon management services.
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

/**
 * Normalize coupon code into canonical storage/compare form.
 */
export function normalizeCouponCode(raw: string): string {
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

/**
 * Resolve checkout totals and coupon snapshots for capture validation.
 */
export async function resolveCheckoutCouponPricing(args: {
  subtotal: number;
  couponCode: string | null | undefined;
  // storefront numeric user id is required for targeted vouchers.
  userId?: number | null;
}): Promise<ResolvedCheckoutCoupon> {
  // central pricing resolver is source of truth for checkout and capture.
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
  // enforce one-time-per-user policy for every coupon type.
  if (!userId) return "coupon_requires_login";

  const a = await prisma.userCouponAssignment.findUnique({
    where: { userId_couponId: { userId, couponId } },
    select: { usedAt: true },
  });

  // ASSIGNED_USERS coupons must be pre-assigned to the user.
  if (scope === "ASSIGNED_USERS" && !a) return "coupon_not_assigned";

  // Any existing usedAt means this user has already redeemed this coupon once.
  if (a?.usedAt) return "coupon_already_used";

  return null;
}

/**
 * Handles validate coupon window.
 */
export function validateCouponWindow(
  coupon: Pick<
    Coupon,
    "isActive" | "startsAt" | "endsAt" | "usageLimit" | "usedCount"
  >,
  now: Date,
): string | null {
  if (!coupon.isActive) return "coupon_inactive";
  if (coupon.startsAt && now < coupon.startsAt) return "coupon_not_started";
  if (coupon.endsAt && now > coupon.endsAt) return "coupon_expired";
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return "coupon_used_up";
  }
  return null;
}

/**
 * Handles validate coupon for subtotal.
 */
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

/**
 * Format a short coupon offer label for storefront UI.
 */
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

type StorefrontVoucherPublicWithId = StorefrontVoucherPublic & {
  couponId: number;
};

export type StorefrontVoucherDto = StorefrontVoucherPublic & {
  scope: "USER" | "GLOBAL";
};

/**
 * List active PUBLIC coupons flagged for the storefront voucher strip (cart/checkout).
 */
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

async function listStorefrontVouchersPublicWithIdService(opts?: {
  subtotal?: number | null;
}): Promise<StorefrontVoucherPublicWithId[]> {
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
  const out: StorefrontVoucherPublicWithId[] = [];
  for (const c of rows) {
    if (validateCouponWindow(c, now)) continue;
    const minSub =
      c.minOrderSubtotal != null ? moneyToNumber(c.minOrderSubtotal) : null;
    const meetsMinimumSpend =
      sub == null || !Number.isFinite(sub)
        ? null
        : minSub == null || sub >= minSub;
    out.push({
      couponId: c.id,
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

/**
 * List storefront vouchers visible to a specific user.
 *
 * If the user has any redeemable ASSIGNED_USERS vouchers, we only show those and
 * hide PUBLIC vouchers (Shopee-like “clipped vouchers” behavior).
 */
export async function listStorefrontVouchersForUserService(opts?: {
  subtotal?: number | null;
  userId?: number | null;
}): Promise<StorefrontVoucherDto[]> {
  const now = new Date();
  const sub = opts?.subtotal ?? null;
  const userId = opts?.userId ?? null;

  const userCoupons: StorefrontVoucherDto[] = [];
  if (userId != null) {
    const assigned = await prisma.userCouponAssignment.findMany({
      where: { userId, usedAt: null },
      select: {
        coupon: {
          select: {
            id: true,
            code: true,
            description: true,
            discountType: true,
            value: true,
            minOrderSubtotal: true,
            maxDiscount: true,
            startsAt: true,
            endsAt: true,
            usageLimit: true,
            usedCount: true,
            isActive: true,
            redemptionScope: true,
            showOnStorefront: true,
            voucherHeadline: true,
          },
        },
      },
    });

    const coupons = assigned
      .map((a) => a.coupon)
      .filter((c): c is (typeof assigned)[number]["coupon"] => Boolean(c));

    // Only show redeemable ASSIGNED_USERS vouchers.
    const redeemableAssigned = coupons.filter((c) => {
      if (c.redemptionScope !== "ASSIGNED_USERS") return false;
      if (!c.isActive) return false;
      return !validateCouponWindow(c, now);
    });

    userCoupons.push(
      ...redeemableAssigned.map((c) => {
        const minSub =
          c.minOrderSubtotal != null ? moneyToNumber(c.minOrderSubtotal) : null;
        const meetsMinimumSpend =
          sub == null || !Number.isFinite(sub)
            ? null
            : minSub == null || sub >= minSub;
        return {
          code: c.code,
          headline: c.voucherHeadline?.trim() || null,
          detail: c.description?.trim() || null,
          offerLabel: formatCouponOfferLabel(c),
          minOrderSubtotal: minSub,
          endsAt: c.endsAt?.toISOString() ?? null,
          meetsMinimumSpend,
          scope: "USER" as const,
        };
      }),
    );
  }

  // Hide PUBLIC vouchers already redeemed by this user (one-time-per-user policy).
  // Redemption is recorded via `UserCouponAssignment.usedAt` even for PUBLIC coupons.
  const usedPublicCouponIds =
    userId != null
      ? new Set(
          (
            await prisma.userCouponAssignment.findMany({
              where: { userId, usedAt: { not: null } },
              select: {
                coupon: { select: { id: true, redemptionScope: true } },
              },
            })
          )
            .map((r) => r.coupon)
            .filter(
              (
                c,
              ): c is { id: number; redemptionScope: CouponRedemptionScope } =>
                Boolean(c),
            )
            .filter((c) => c.redemptionScope === "PUBLIC")
            .map((c) => c.id),
        )
      : null;

  const globalCoupons = await listStorefrontVouchersPublicWithIdService({
    subtotal: sub,
  });
  const globalNotUsed =
    usedPublicCouponIds && usedPublicCouponIds.size > 0
      ? globalCoupons.filter((v) => !usedPublicCouponIds.has(v.couponId))
      : globalCoupons;

  return [
    ...userCoupons,
    ...globalNotUsed.map((v) => ({
      code: v.code,
      headline: v.headline,
      detail: v.detail,
      offerLabel: v.offerLabel,
      minOrderSubtotal: v.minOrderSubtotal,
      endsAt: v.endsAt,
      meetsMinimumSpend: v.meetsMinimumSpend,
      scope: "GLOBAL" as const,
    })),
  ];
}

/**
 * Handles compute discount amount.
 */
export function computeDiscountAmount(
  subtotal: number,
  coupon: Pick<Coupon, "discountType" | "value" | "maxDiscount">,
): number {
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

/**
 * List coupons for admin management UI.
 */
export async function listCouponsAdminService() {
  return prisma.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });
}

/**
 * Create a coupon from admin input with normalization applied.
 */
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

/**
 * Update a coupon from admin input.
 */
export async function updateCouponAdminService(
  id: number,
  data: Prisma.CouponUpdateInput,
) {
  return prisma.coupon.update({ where: { id }, data });
}

/**
 * Deactivate a coupon so it no longer applies at checkout.
 */
export async function deactivateCouponAdminService(id: number) {
  return prisma.coupon.update({
    where: { id },
    data: { isActive: false },
  });
}
