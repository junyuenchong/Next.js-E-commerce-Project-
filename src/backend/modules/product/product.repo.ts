import prisma from "@/app/lib/prisma";
import { productReviewHasIsActiveColumn } from "@/backend/modules/review/review-schema-capability";
import { moneyToNumber } from "@/backend/core/money";
import type { OrderStatus, Prisma } from "@prisma/client";
import type { ProductSearchSort } from "@/shared/types/product";

export const productListSelect = {
  id: true,
  title: true,
  description: true,
  compareAtPrice: true,
  price: true,
  imageUrl: true,
  slug: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  stock: true,
  isActive: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.ProductSelect;

export type ProductListItem = Prisma.ProductGetPayload<{
  select: typeof productListSelect;
}>;

export async function findProductBySlug(
  slug: string,
  options?: { activeOnly?: boolean },
) {
  if (options?.activeOnly) {
    return prisma.product.findFirst({
      where: { slug, isActive: true },
      include: { category: true },
    });
  }
  return prisma.product.findUnique({
    where: { slug },
    include: { category: true },
  });
}

export async function findProductById(
  id: number,
  options?: { activeOnly?: boolean },
) {
  if (options?.activeOnly) {
    return prisma.product.findFirst({
      where: { id, isActive: true },
      include: { category: true },
    });
  }
  return prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
}

export async function findProducts(params: { take: number; skip: number }) {
  return prisma.product.findMany({
    where: { isActive: true },
    select: productListSelect,
    orderBy: { id: "desc" },
    take: params.take,
    skip: params.skip,
  });
}

export async function findProductsCursor(params: {
  take: number;
  cursorId?: number;
}) {
  return prisma.product.findMany({
    where: { isActive: true },
    select: productListSelect,
    orderBy: { id: "desc" },
    take: params.take,
    ...(params.cursorId
      ? {
          cursor: { id: params.cursorId },
          skip: 1,
        }
      : {}),
  });
}

export async function searchProductsQuery(query: string) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { category: { name: { contains: query, mode: "insensitive" } } },
        { category: { slug: { contains: query, mode: "insensitive" } } },
      ],
    },
    select: productListSelect,
    orderBy: { id: "desc" },
    take: 50,
  });
}

function orderByFromSort(
  sort?: string,
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "newest":
      return { createdAt: "desc" };
    case "oldest":
      return { createdAt: "asc" };
    case "name_az":
      return { title: "asc" };
    case "relevance":
    default:
      return { id: "desc" };
  }
}

export async function searchProductsWithFiltersQuery(params: {
  query?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: ProductSearchSort | string;
  take?: number;
}) {
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (params.categorySlug?.trim()) {
    where.category = { slug: params.categorySlug.trim() };
  }
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.price = {};
    if (params.minPrice !== undefined) where.price.gte = params.minPrice;
    if (params.maxPrice !== undefined) where.price.lte = params.maxPrice;
  }
  const q = params.query?.trim();
  if (q) {
    where.AND = [
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
    ];
  }
  if (params.minRating !== undefined && params.minRating > 0) {
    where.reviews = { some: { rating: { gte: params.minRating } } };
  }
  const take = params.take && params.take > 0 ? params.take : 120;
  const orderBy = orderByFromSort(params.sort);
  return prisma.product.findMany({
    where,
    select: productListSelect,
    orderBy,
    take,
  });
}

export async function createProductRecord(data: {
  title: string;
  slug: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  imageUrl?: string | null;
  categoryId: number;
}) {
  return prisma.product.create({ data });
}

export async function updateProductRecord(
  id: number,
  data: {
    title: string;
    slug: string;
    description?: string | null;
    price: number;
    compareAtPrice?: number | null;
    stock: number;
    imageUrl?: string | null;
    categoryId: number;
  },
) {
  return prisma.product.update({ where: { id }, data });
}

/** Soft delete: hide from storefront; keeps FK history (orders, reviews). */
export async function softDeactivateProductById(id: number) {
  return prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function slugExists(slug: string) {
  const existing = await prisma.product.findFirst({
    where: { slug },
    select: { id: true },
  });
  return Boolean(existing);
}

/** Review + paid-order volume used on storefront cards (no fictional metrics). */
export type ProductPublicListStats = {
  reviewCount: number;
  avgRating: number | null;
  soldLast24h: number;
};

const PAID_ORDER_STATUSES: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "fulfilled",
];

function likelyMissingColumnError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("isActive") ||
    msg.includes("42703") ||
    msg.toLowerCase().includes("does not exist")
  );
}

/**
 * Batch-load review aggregates and units sold (paid orders) in the last 24 hours.
 */
export async function getProductPublicListStats(
  productIds: number[],
): Promise<Map<number, ProductPublicListStats>> {
  const map = new Map<number, ProductPublicListStats>();
  if (productIds.length === 0) return map;

  for (const id of productIds) {
    map.set(id, { reviewCount: 0, avgRating: null, soldLast24h: 0 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  async function reviewGroupBy(filterActiveOnly: boolean) {
    return prisma.productReview.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        ...(filterActiveOnly ? { isActive: true } : {}),
      },
      _count: { _all: true },
      _avg: { rating: true },
    });
  }

  const reviewHasIsActive = await productReviewHasIsActiveColumn();
  const reviewGroups = await reviewGroupBy(reviewHasIsActive);

  const soldLast24hQuery = () =>
    prisma.orderLineItem.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        order: {
          createdAt: { gte: since },
          status: { in: PAID_ORDER_STATUSES },
        },
      },
      _sum: { quantity: true },
    });

  let soldGroups: Awaited<ReturnType<typeof soldLast24hQuery>>;
  try {
    soldGroups = await soldLast24hQuery();
  } catch (soldErr: unknown) {
    if (!likelyMissingColumnError(soldErr)) throw soldErr;
    soldGroups = [];
  }

  for (const row of reviewGroups) {
    const cur = map.get(row.productId);
    if (!cur) continue;
    cur.reviewCount = row._count._all;
    const raw = row._avg.rating;
    cur.avgRating =
      raw != null && Number.isFinite(Number(raw))
        ? Math.round(Number(raw) * 10) / 10
        : null;
  }

  for (const row of soldGroups) {
    const cur = map.get(row.productId);
    if (!cur) continue;
    cur.soldLast24h = row._sum.quantity ?? 0;
  }

  return map;
}

export async function attachPublicListStats<T extends { id: number }>(
  items: T[],
): Promise<Array<T & ProductPublicListStats>> {
  if (items.length === 0) return [];
  const empty = {
    reviewCount: 0,
    avgRating: null,
    soldLast24h: 0,
  } satisfies ProductPublicListStats;
  let stats: Map<number, ProductPublicListStats>;
  try {
    stats = await getProductPublicListStats(items.map((i) => i.id));
  } catch (e) {
    console.error("[attachPublicListStats] stats query failed:", e);
    stats = new Map();
  }
  return items.map((item) => {
    const s = stats.get(item.id) ?? empty;
    return { ...item, ...s };
  });
}

/** JSON-safe row for admin HTTP responses (Prisma `Decimal` → number). */
export function serializeAdminProductListItem(
  row: ProductListItem & ProductPublicListStats,
) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    compareAtPrice:
      row.compareAtPrice == null ? null : moneyToNumber(row.compareAtPrice),
    price: moneyToNumber(row.price),
    imageUrl: row.imageUrl,
    slug: row.slug,
    categoryId: row.categoryId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    stock: row.stock,
    isActive: row.isActive,
    category: row.category,
    reviewCount: row.reviewCount,
    avgRating: row.avgRating,
    soldLast24h: row.soldLast24h,
  };
}
