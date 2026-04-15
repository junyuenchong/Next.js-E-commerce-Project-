"use client";

/** Shared helpers + query keys from `@/app/lib`. */
export {
  categorySchema,
  categorySlugSchema,
  productSchema,
  productSlugSchema,
} from "@/shared/schema/admin";
export { getErrorMessage } from "@/app/utils/http";
export { qk } from "@/app/lib/query-keys";

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
