"use client";

/**
 * admin shared exports
 * export admin shared hooks
 */

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
