import { formatPriceRM, resolveSalePricing } from "@/app/lib/format-price";

type ProductPriceProps = {
  salePrice: unknown;
  compareAtPrice?: unknown;
  containerClassName?: string;
  salePriceClassName?: string;
  compareAtPriceClassName?: string;
  discountBadgeClassName?: string;
  salePricePrefix?: string;
  discountSuffix?: string;
  stripSalePriceCurrency?: boolean;
};

export default function ProductPrice({
  salePrice,
  compareAtPrice,
  containerClassName = "flex flex-wrap items-end gap-2",
  salePriceClassName = "text-lg font-bold text-red-600",
  compareAtPriceClassName = "text-sm text-gray-400 line-through",
  discountBadgeClassName,
  salePricePrefix,
  discountSuffix = "%",
  stripSalePriceCurrency = false,
}: ProductPriceProps) {
  // Note: pricing rules stay centralized so card/PDP/admin always match.
  const pricing = resolveSalePricing(compareAtPrice, salePrice);
  const salePriceLabel = stripSalePriceCurrency
    ? formatPriceRM(pricing.salePriceNumber).replace("RM ", "")
    : formatPriceRM(pricing.salePriceNumber);

  return (
    <div className={containerClassName}>
      <span className={salePriceClassName}>
        {salePricePrefix
          ? `${salePricePrefix}${salePriceLabel}`
          : salePriceLabel}
      </span>
      {pricing.hasDiscount && pricing.compareAtPriceNumber != null ? (
        <span className={compareAtPriceClassName}>
          {formatPriceRM(pricing.compareAtPriceNumber)}
        </span>
      ) : null}
      {pricing.discountPercent != null && discountBadgeClassName ? (
        <span className={discountBadgeClassName}>
          -{pricing.discountPercent}
          {discountSuffix}
        </span>
      ) : null}
    </div>
  );
}
