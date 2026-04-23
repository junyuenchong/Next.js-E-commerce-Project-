// Module: Provides review repository queries and updates for product feedback workflows.
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

/**
 * List active product reviews for storefront pages.
 */
export async function listProductReviews(productId: number) {
  // some environments may not have `ProductReview.isActive` yet.
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

/**
 * List product reviews for admin moderation views.
 */
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

/**
 * Create or update a user's review for a product.
 */
export async function upsertProductReview(params: {
  productId: number;
  userId: number;
  rating: number;
  comment: string;
}) {
  // keep one review per (product,user) and reactivate soft-removed rows.
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

/**
 * Update the admin reply on a review.
 */
export async function updateAdminReply(reviewId: number, adminReply: string) {
  // reply update intentionally avoids rating/comment mutations.
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

/**
 * Find a product id row for review validation.
 */
export async function findProductById(productId: number) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
}

/**
 * Check whether the user has a fulfilled order for this product.
 */
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

/**
 * Soft-delete a review when schema supports isActive.
 */
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

/**
 * List admin reviews with pagination and optional filters.
 */
export async function listAllReviewsAdminRepo(params: {
  skip: number;
  take: number;
  productId?: number;
  q?: string;
}) {
  // build filters incrementally for deterministic active/product/search conditions.
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
