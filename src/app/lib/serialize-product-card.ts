import type { ProductCardProduct } from "@/app/features/user/types";
import { moneyToNumber } from "@/backend/core/money";

function toIso(d: unknown): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return String(d);
}

/**
 * product serializer
 * convert product data to json-safe client shape
 */
export function serializeProductCardForClient(
  p: ProductCardProduct,
): ProductCardProduct {
  const row = { ...(p as Record<string, unknown>) };
  delete row.category;

  return {
    ...(row as unknown as ProductCardProduct),
    price: moneyToNumber(p.price) as unknown as ProductCardProduct["price"],
    compareAtPrice: (p.compareAtPrice == null
      ? null
      : moneyToNumber(
          p.compareAtPrice,
        )) as unknown as ProductCardProduct["compareAtPrice"],
    createdAt: toIso(p.createdAt) as unknown as ProductCardProduct["createdAt"],
    updatedAt: toIso(p.updatedAt) as unknown as ProductCardProduct["updatedAt"],
  };
}

export function serializeProductCardListForClient(list: ProductCardProduct[]) {
  return list.map(serializeProductCardForClient);
}
