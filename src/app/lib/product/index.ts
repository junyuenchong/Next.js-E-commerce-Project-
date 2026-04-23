/**
 * product lib exports
 * export product formatting and payload helpers
 */
export {
  buildAdminProductPayload,
  type AdminProductPayload,
} from "@/app/lib/admin-product-form";
export {
  formatPriceRM,
  formatPriceRMFlexible,
  discountPercentFromCompareAt,
  resolveSalePricing,
} from "@/app/lib/format-price";
export {
  serializeProductCardForClient,
  serializeProductCardListForClient,
} from "@/app/lib/serialize-product-card";
export { IMG } from "@/app/lib/image-sizes";
export {
  messageFromReviewSubmitError,
  messageFromReviewSubmitError as reviewErrorMessage,
} from "@/app/lib/review-errors";
