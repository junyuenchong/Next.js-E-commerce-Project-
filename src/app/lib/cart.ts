/** Cart: API → Redux lines, and live line totals for checkout. */
import type { CartItemRowData } from "@/app/modules/user/types";
import { moneyToNumber } from "@/backend/core/money";

export type CartReduxLine = {
  id: string;
  productId: number;
  title: string;
  price: number;
  quantity: number;
  image: string;
};

export function cartLinesFromApiPayload(data: unknown): {
  items: CartReduxLine[];
  id: string;
} | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { items?: unknown[]; id?: unknown };
  if (typeof d.id !== "string") return null;
  const items = (d.items || []).map((item: unknown) => {
    const i = item as Record<string, unknown>;
    return {
      id: String(i.id ?? ""),
      productId: Number(i.productId),
      title: String(i.title ?? ""),
      price: Number(i.price ?? 0),
      quantity: Number(i.quantity ?? 0),
      image: String(i.image ?? ""),
    };
  });
  return { items, id: d.id };
}

export function lineUnitPrice(item: CartItemRowData): number {
  const raw = item.liveProduct?.price ?? item.price;
  return moneyToNumber(raw);
}

export function summarizeCartLines(items: CartItemRowData[]) {
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce(
    (s, i) => s + lineUnitPrice(i) * i.quantity,
    0,
  );
  return { totalItems, totalPrice };
}
