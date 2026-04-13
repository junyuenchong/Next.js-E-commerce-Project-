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

export async function listProductReviews(productId: number) {
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

/** Admin product card: active reviews only (soft-removed hidden like a real delete). */
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

export async function upsertProductReview(params: {
  productId: number;
  userId: number;
  rating: number;
  comment: string;
}) {
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

export async function updateAdminReply(reviewId: number, adminReply: string) {
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

export async function findProductById(productId: number) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
}

/** Soft-remove when the column exists; otherwise hard-delete (pre-migration DBs). */
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

export async function listAllReviewsAdminRepo(params: {
  skip: number;
  take: number;
  productId?: number;
  q?: string;
}) {
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
