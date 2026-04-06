export const cacheKeys = {
  productsList: (take: number, page: number) => `products:list:${take}:${page}`,
  productById: (id: number) => `product:id:${id}`,
  productBySlug: (slug: string) => `product:slug:${slug}`,

  categoriesAll: () => `categories:all`,
  categoryBySlug: (slug: string) => `category:slug:${slug}`,
  productsByCategory: (slug: string, take: number | "all", page: number) =>
    `products:by-category:${slug}:${take}:${page}`,
} as const;
