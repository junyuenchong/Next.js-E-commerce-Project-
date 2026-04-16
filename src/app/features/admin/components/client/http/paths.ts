/** App Router handlers under `/features/admin/api`. */
export const adminApiPaths = {
  categories: "/features/admin/api/categories",
  products: "/features/admin/api/products",
  eventsProducts: "/features/admin/api/events/products",
  eventsCategories: "/features/admin/api/events/categories",
  productReviews: (productId: number) =>
    `/features/admin/api/products/${productId}/reviews`,
  reviewReply: (reviewId: number) =>
    `/features/admin/api/reviews/${reviewId}/reply`,
  reviewById: (reviewId: number) => `/features/admin/api/reviews/${reviewId}`,
  reviews: "/features/admin/api/reviews",
  coupons: "/features/admin/api/coupons",
  auditLog: "/features/admin/api/audit-log",
} as const;
