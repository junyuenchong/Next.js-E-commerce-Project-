/**
 * Admin feature type re-exports: UI imports from here instead of reaching into component files.
 */

export type { Category } from "@/shared/types";
export type {
  ProductItemProps,
  ProductWithCategory,
} from "@/app/features/admin/components/client/products/types/ProductItem";
export type { AdminMe, AdminMeCan } from "@/shared/types";
export type {
  AdminCategoryCreateBody,
  AdminCategoryPatchBody,
  AdminRolePatchPermissionsBody,
  AdminRolePatchProfileMetaBody,
  AdminRolePostBody,
  AdminUpdateOrderStatusBody,
  AdminUpdateReviewReplyBody,
  AdminUserPatchBody,
} from "@/shared/types";
