"use client";

/**
 * Admin feature: client-side logic in one place (hooks, small utils, form helpers).
 * Keeps `components/` for UI and `api/` for Route Handlers only — easier to navigate.
 */

export {
  categorySchema,
  categorySlugSchema,
  productSchema,
  productSlugSchema,
} from "@/shared/schema";
export { getErrorMessage } from "@/app/utils/http";
export { qk } from "@/app/lib/query-keys";

export { fetchSameOriginJson } from "./same-origin-fetch";
export { trySetFieldErrorsFromAxios400 } from "./field-errors";
export {
  buildAdminProductPayload,
  type AdminProductPayload,
} from "./product-form";

export { useAdminResourceSSE } from "./useAdminResourceSSE";
export { useRealtimeInvalidate, useRealtimeQuery } from "./useRealtimeQuery";
export {
  useCategoryManager,
  type ActionResponse,
  type UseCategoryManagerProps,
} from "./useCategoryManager";
export { useAdminCategoriesForManager } from "./useAdminCategoriesForManager";
export {
  useAdminProductList,
  type AdminProductListHandle,
} from "./useAdminProductList";
export {
  useAdminProductReviews,
  type AdminReviewItem,
} from "./useAdminProductReviews";
export { useAdminProductCreateForm } from "./useAdminProductCreateForm";
