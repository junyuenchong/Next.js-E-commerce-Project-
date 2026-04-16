// Feature: Implements review repository queries and updates for product feedback workflows.
import type { Prisma } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { productReviewHasIsActiveColumn } from "./review-schema-capability";

const userInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
} as const;

// Feature: list storefront product reviews, hiding soft-deactivated rows when supported.
export async function listProductReviews(productId: number) {
  // Fallback: some environments may not have `ProductReview.isActive` yet.
  const hasIsActive = await productReviewHasIsActiveColumn();
  if (hasIsActive) {
    return prisma.productReview.findMany({
      where: { productId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: userInclude,
    });
  }
  return prisma.productReview.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    include: userInclude,
    omit: { isActive: true },
  });
}

// Guard: admin product card list returns active reviews only.
export async function listProductReviewsForAdmin(productId: number) {
  const hasIsActive = await productReviewHasIsActiveColumn();
  if (hasIsActive) {
    return prisma.productReview.findMany({
      where: { productId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: userInclude,
    });
  }
  return prisma.productReview.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    include: userInclude,
    omit: { isActive: true },
  });
}

// Feature: upsert user review and reactivate when previously soft-deactivated.
export async function upsertProductReview(params: {
  productId: number;
  userId: number;
  rating: number;
  comment: string;
}) {
  // Feature: keep one review per (product,user) and reactivate soft-removed rows.
  const hasIsActive = await productReviewHasIsActiveColumn();
  const where = {
    productId_userId: {
      productId: params.productId,
      userId: params.userId,
    },
  } as const;
  const baseUpdate = {
    rating: params.rating,
    comment: params.comment,
  };
  const baseCreate = {
    productId: params.productId,
    userId: params.userId,
    rating: params.rating,
    comment: params.comment,
  };

  if (hasIsActive) {
    return prisma.productReview.upsert({
      where,
      update: { ...baseUpdate, isActive: true },
      create: { ...baseCreate, isActive: true },
    });
  }
  return prisma.productReview.upsert({
    where,
    update: baseUpdate,
    create: baseCreate,
    omit: { isActive: true },
  });
}

// Feature: update admin reply field without rating/comment changes.
export async function updateAdminReply(reviewId: number, adminReply: string) {
  // Guard: reply update intentionally avoids rating/comment mutations.
  const hasIsActive = await productReviewHasIsActiveColumn();
  if (hasIsActive) {
    return prisma.productReview.update({
      where: { id: reviewId },
      data: { adminReply },
    });
  }
  return prisma.productReview.update({
    where: { id: reviewId },
    data: { adminReply },
    omit: { isActive: true },
  });
}

// Guard: validate product id existence for service-layer guards.
export async function findProductById(productId: number) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
}

// Guard: only customers with a fulfilled order containing the product may review it.
export async function hasUserPurchasedProduct(
  userId: number,
  productId: number,
) {
  return prisma.orderLineItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        // Business rule: allow reviews only after the order is fulfilled.
        status: "fulfilled",
      },
    },
    select: { id: true },
  });
}

// Fallback: soft-remove when column exists; hard-delete for pre-migration databases.
export async function softDeactivateProductReviewById(reviewId: number) {
  const hasIsActive = await productReviewHasIsActiveColumn();
  if (hasIsActive) {
    return prisma.productReview.update({
      where: { id: reviewId },
      data: { isActive: false },
    });
  }
  return prisma.productReview.delete({
    where: { id: reviewId },
  });
}

// Feature: list admin moderation reviews with optional product/search filters.
export async function listAllReviewsAdminRepo(params: {
  skip: number;
  take: number;
  productId?: number;
  q?: string;
}) {
  // Feature: build filters incrementally for deterministic active/product/search conditions.
  const hasIsActive = await productReviewHasIsActiveColumn();
  const and: Prisma.ProductReviewWhereInput[] = [];
  if (hasIsActive) and.push({ isActive: true });
  if (params.productId) and.push({ productId: params.productId });
  const trimmed = params.q?.trim();
  if (trimmed) {
    and.push({
      OR: [
        { comment: { contains: trimmed, mode: "insensitive" } },
        { adminReply: { contains: trimmed, mode: "insensitive" } },
      ],
    });
  }
  const where = and.length ? { AND: and } : {};

  const [rows, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        product: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.productReview.count({ where }),
  ]);

  return { rows, total };
}
