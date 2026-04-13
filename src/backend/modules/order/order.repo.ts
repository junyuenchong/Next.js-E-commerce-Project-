import { Prisma, type OrderStatus } from "@prisma/client";
import prisma from "@/backend/shared/db/prisma";
import type { CreatePaidOrderInput } from "./types/order.type";

export async function createPaidOrderRepo(
  input: CreatePaidOrderInput,
  options?: { skipStockDecrement?: boolean },
) {
  const discount = input.discountAmount ?? 0;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: input.userId,
        emailSnapshot: input.emailSnapshot,
        status: "paid",
        currency: input.currency,
        total: input.total,
        paypalOrderId: input.paypalOrderId,
        paypalCaptureId: input.paypalCaptureId,
        couponId: input.couponId ?? undefined,
        couponCodeSnapshot: input.couponCodeSnapshot ?? undefined,
        discountAmount: new Prisma.Decimal(discount.toFixed(2)),
        shippingLine1: input.shippingLine1 ?? undefined,
        shippingCity: input.shippingCity ?? undefined,
        shippingPostcode: input.shippingPostcode ?? undefined,
        shippingCountry: input.shippingCountry ?? undefined,
        shippingMethod: input.shippingMethod ?? undefined,
        items: {
          create: input.lines.map((line) => ({
            productId: line.productId,
            title: line.title,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            imageUrl: line.imageUrl,
          })),
        },
      },
      include: { items: true },
    });

    if (input.couponId != null) {
      const c = await tx.coupon.findUnique({ where: { id: input.couponId } });
      if (!c?.isActive) {
        throw new Error("coupon_invalid_at_capture");
      }
      if (c.usageLimit != null && c.usedCount >= c.usageLimit) {
        throw new Error("coupon_exhausted_at_capture");
      }
      if (c.redemptionScope === "ASSIGNED_USERS") {
        if (!input.userId) {
          throw new Error("coupon_requires_login_at_capture");
        }
        const a = await tx.userCouponAssignment.findUnique({
          where: {
            userId_couponId: { userId: input.userId, couponId: input.couponId },
          },
          select: { usedAt: true },
        });
        if (!a) throw new Error("coupon_not_assigned_at_capture");
        if (a.usedAt) throw new Error("coupon_already_used_at_capture");
        await tx.userCouponAssignment.update({
          where: {
            userId_couponId: { userId: input.userId, couponId: input.couponId },
          },
          data: { usedAt: new Date() },
        });
      }
      await tx.coupon.update({
        where: { id: input.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (!options?.skipStockDecrement) {
      await Promise.all(
        input.lines.map((line) =>
          tx.product.update({
            where: { id: line.productId },
            data: { stock: { decrement: line.quantity } },
          }),
        ),
      );
    }

    return order;
  });
}

/** Apply stock decrements (used when RabbitMQ is off, or as fallback if enqueue fails). */
export async function decrementStockForOrderLinesRepo(
  lines: { productId: number; quantity: number }[],
) {
  await prisma.$transaction(async (tx) => {
    await Promise.all(
      lines.map((line) =>
        tx.product.update({
          where: { id: line.productId },
          data: { stock: { decrement: line.quantity } },
        }),
      ),
    );
  });
}

const DEFAULT_PAGE = 40;
const MAX_PAGE = 100;

export async function listOrdersForUserRepo(
  userId: number,
  cursorId?: number,
  take = DEFAULT_PAGE,
) {
  const limit = Math.min(Math.max(1, take), MAX_PAGE);
  const rows = await prisma.order.findMany({
    where: {
      userId,
      ...(cursorId != null ? { id: { lt: cursorId } } : {}),
    },
    orderBy: { id: "desc" },
    take: limit + 1,
    select: {
      id: true,
      status: true,
      total: true,
      currency: true,
      paypalOrderId: true,
      createdAt: true,
    },
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;
  return { orders: page, nextCursor };
}

export async function findOrderByPayPalIdRepo(paypalOrderId: string) {
  return prisma.order.findUnique({
    where: { paypalOrderId },
    select: { id: true },
  });
}

export async function findOrderForUserByIdRepo(
  userId: number,
  orderId: number,
) {
  if (!Number.isFinite(userId) || userId < 1) return null;
  if (!Number.isFinite(orderId) || orderId < 1) return null;
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      coupon: { select: { code: true } },
      items: { orderBy: { id: "asc" } },
    },
  });
}

function orderAdminListWhere(
  cursorId?: number,
  q?: string,
): Prisma.OrderWhereInput {
  const parts: Prisma.OrderWhereInput[] = [];
  if (cursorId != null) parts.push({ id: { lt: cursorId } });
  const trimmed = q?.trim() ?? "";
  if (trimmed) {
    const idNum = Number.parseInt(trimmed, 10);
    const or: Prisma.OrderWhereInput[] = [
      { paypalOrderId: { contains: trimmed, mode: "insensitive" } },
      { emailSnapshot: { contains: trimmed, mode: "insensitive" } },
      { user: { is: { email: { contains: trimmed, mode: "insensitive" } } } },
    ];
    if (Number.isFinite(idNum) && idNum > 0) or.push({ id: idNum });
    parts.push({ OR: or });
  }
  return parts.length ? { AND: parts } : {};
}

export async function listAllOrdersAdminRepo(
  cursorId?: number,
  take = DEFAULT_PAGE,
  q?: string,
) {
  const limit = Math.min(Math.max(1, take), MAX_PAGE);
  const rows = await prisma.order.findMany({
    where: orderAdminListWhere(cursorId, q),
    orderBy: { id: "desc" },
    take: limit + 1,
    include: {
      user: { select: { email: true, name: true } },
      items: { take: 8 },
    },
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;
  return { orders: page, nextCursor };
}

export async function findOrderAdminByIdRepo(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      items: { orderBy: { id: "asc" } },
    },
  });
}

export async function updateOrderStatusRepo(
  orderId: number,
  status: OrderStatus,
) {
  return prisma.order.update({
    where: { id: orderId },
    data: { status },
  });
}
