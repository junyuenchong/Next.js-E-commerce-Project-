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
