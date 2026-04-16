/** MYR display + sale badge % from compare-at vs price. */
import { moneyToNumber } from "@/backend/core/money";

export function formatPriceRM(value: unknown): string {
  const n = moneyToNumber(value);
  return `RM ${n.toFixed(2)}`;
}

export function formatPriceRMFlexible(value: unknown): string {
  const n = moneyToNumber(value);
  if (Number.isInteger(n)) return `RM ${n}`;
  return `RM ${n.toFixed(2)}`;
}

export function discountPercentFromCompareAt(
  compareAt: unknown,
  salePrice: unknown,
): number | null {
  const c = moneyToNumber(compareAt);
  const p = moneyToNumber(salePrice);
  if (!Number.isFinite(c) || !Number.isFinite(p) || c <= p) {
    return null;
  }
  return Math.round((1 - p / c) * 100);
}

/** Normalize product pricing for consistent UI (card/PDP/admin). */
export function resolveSalePricing(
  compareAt: unknown,
  salePrice: unknown,
): {
  salePriceNumber: number;
  compareAtPriceNumber: number | null;
  discountPercent: number | null;
  hasDiscount: boolean;
} {
  const salePriceNumber = moneyToNumber(salePrice);
  // Guard: keep "unset" compare-at as null (avoid treating null/"" as 0).
  const compareAtPriceNumber =
    compareAt === null || compareAt === undefined || compareAt === ""
      ? null
      : (() => {
          const n = moneyToNumber(compareAt);
          return Number.isFinite(n) ? n : null;
        })();
  const discountPercent = discountPercentFromCompareAt(
    compareAtPriceNumber,
    salePriceNumber,
  );
  const hasDiscount =
    compareAtPriceNumber != null && compareAtPriceNumber > salePriceNumber;

  return {
    salePriceNumber,
    compareAtPriceNumber,
    discountPercent,
    hasDiscount,
  };
}
