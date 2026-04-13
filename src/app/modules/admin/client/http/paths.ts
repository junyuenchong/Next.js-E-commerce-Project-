/** App Router handlers under `/modules/admin/api`. */
export const adminApiPaths = {
  categories: "/modules/admin/api/categories",
  products: "/modules/admin/api/products",
  eventsProducts: "/modules/admin/api/events/products",
  eventsCategories: "/modules/admin/api/events/categories",
  productReviews: (productId: number) =>
    `/modules/admin/api/products/${productId}/reviews`,
  reviewReply: (reviewId: number) =>
    `/modules/admin/api/reviews/${reviewId}/reply`,
  reviewById: (reviewId: number) => `/modules/admin/api/reviews/${reviewId}`,
  reviews: "/modules/admin/api/reviews",
  coupons: "/modules/admin/api/coupons",
  auditLog: "/modules/admin/api/audit-log",
} as const;
