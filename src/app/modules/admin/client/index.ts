/**
 * Barrel: **HTTP** helpers for the admin module. Screen components live under
 * `client/components/...` (grouped by route area, same names as `(main)/...` segments).
 */
export { adminApiPaths } from "./http/paths";
export { fetchAdminCategories } from "./http/categoriesClient";
export {
  adminProductsListUrl,
  fetchAdminProductsByUrl,
  prefetchAdminProductsPreview,
  ADMIN_PRODUCTS_PAGE_SIZE,
} from "./http/productsClient";
export {
  deleteAdminReview,
  fetchAdminProductReviews,
  patchAdminReviewReply,
} from "./http/reviewsClient";
export { postImageUpload } from "./http/uploadClient";
