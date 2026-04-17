// Feature: Implements order persistence for paid-order creation, stock updates, and admin queries.
import { Prisma, type OrderStatus } from "@prisma/client";
import prisma from "@/backend/core/db/prisma";
import {
  shouldDeductForTransition,
  shouldRestockForTransition,
} from "@/backend/core/stock-policy";
import type { CreatePaidOrderInput } from "@/shared/types";

// Guard: persist paid order and optional stock decrement in single transaction.
export async function createPaidOrderRepo(
  input: CreatePaidOrderInput,
  options?: { skipStockDecrement?: boolean },
) {
  // Guard: one transaction keeps order row, coupon usage, and stock decrement consistent.
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
      if (!input.userId) {
        throw new Error("coupon_requires_login_at_capture");
      }
      const c = await tx.coupon.findUnique({ where: { id: input.couponId } });
      if (!c?.isActive) {
        throw new Error("coupon_invalid_at_capture");
      }
      if (c.usageLimit != null && c.usedCount >= c.usageLimit) {
        throw new Error("coupon_exhausted_at_capture");
      }
      const assignment = await tx.userCouponAssignment.findUnique({
        where: {
          userId_couponId: { userId: input.userId, couponId: input.couponId },
        },
        select: { usedAt: true },
      });

      if (c.redemptionScope === "ASSIGNED_USERS" && !assignment) {
        throw new Error("coupon_not_assigned_at_capture");
      }
      if (assignment?.usedAt) {
        throw new Error("coupon_already_used_at_capture");
      }

      if (assignment) {
        await tx.userCouponAssignment.update({
          where: {
            userId_couponId: { userId: input.userId, couponId: input.couponId },
          },
          data: { usedAt: new Date() },
        });
      } else {
        // PUBLIC coupons also become one-time per authenticated user.
        await tx.userCouponAssignment.create({
          data: {
            userId: input.userId,
            couponId: input.couponId,
            usedAt: new Date(),
          },
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

    const subtotal = input.lines.reduce(
      (sum, line) => sum + line.unitPrice * line.quantity,
      0,
    );
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${order.id}`;
    await tx.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        billedEmail: input.emailSnapshot,
        currency: input.currency,
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        discount: new Prisma.Decimal(discount.toFixed(2)),
        total: new Prisma.Decimal(Number(input.total).toFixed(2)),
        couponCode: input.couponCodeSnapshot ?? undefined,
        lineItems: input.lines,
      },
    });

    return order;
  });
}

// Fallback: apply stock decrements when RabbitMQ is disabled or enqueue fails.
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

// Note: shared cursor-page builder keeps list endpoint behavior consistent.
function pageFromRows<T extends { id: number }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;
  return { page, nextCursor };
}

// Feature: list user's orders using cursor pagination.
export async function listOrdersForUserRepo(
  userId: number,
  cursorId?: number,
  take = DEFAULT_PAGE,
) {
  // Guard: hard clamp protects API against abusive `take` values.
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
  const { page, nextCursor } = pageFromRows(rows, limit);
  return { orders: page, nextCursor };
}

// Feature: look up internal order id by PayPal order id.
export async function findOrderByPayPalIdRepo(paypalOrderId: string) {
  return prisma.order.findUnique({
    where: { paypalOrderId },
    select: { id: true },
  });
}

// Feature: fetch single user order including coupon and items.
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
      invoice: {
        select: {
          invoiceNumber: true,
          issuedAt: true,
          status: true,
        },
      },
    },
  });
}

function orderAdminListWhere(
  cursorId?: number,
  q?: string,
): Prisma.OrderWhereInput {
  // Feature: centralized admin-search predicate keeps list and count semantics aligned.
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

// Feature: list admin dashboard orders with cursor pagination and optional search.
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
  const { page, nextCursor } = pageFromRows(rows, limit);
  return { orders: page, nextCursor };
}

// Feature: fetch single admin-view order including user and items.
export async function findOrderAdminByIdRepo(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true } },
      items: { orderBy: { id: "asc" } },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          issuedAt: true,
          status: true,
        },
      },
    },
  });
}

export async function findInvoiceByUserAndOrderRepo(
  userId: number,
  orderId: number,
) {
  return prisma.invoice.findFirst({
    where: { orderId, order: { userId } },
    select: {
      id: true,
      invoiceNumber: true,
      issuedAt: true,
      billedEmail: true,
      currency: true,
      subtotal: true,
      discount: true,
      total: true,
      couponCode: true,
      lineItems: true,
      status: true,
      orderId: true,
    },
  });
}

export async function findInvoiceByOrderRepo(orderId: number) {
  return prisma.invoice.findUnique({
    where: { orderId },
    select: {
      id: true,
      invoiceNumber: true,
      issuedAt: true,
      billedEmail: true,
      currency: true,
      subtotal: true,
      discount: true,
      total: true,
      couponCode: true,
      lineItems: true,
      status: true,
      orderId: true,
    },
  });
}

export async function ensureInvoiceForOrderRepo(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({
      where: { orderId },
      select: {
        id: true,
        invoiceNumber: true,
        issuedAt: true,
        billedEmail: true,
        currency: true,
        subtotal: true,
        discount: true,
        total: true,
        couponCode: true,
        lineItems: true,
        status: true,
        orderId: true,
      },
    });
    if (existing) return existing;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!order) return null;

    const subtotal = order.items.reduce(
      (sum, line) => sum + Number(line.unitPrice) * line.quantity,
      0,
    );
    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${order.id}`;
    const created = await tx.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        billedEmail: order.emailSnapshot ?? undefined,
        currency: order.currency,
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        discount: order.discountAmount,
        total: order.total,
        couponCode: order.couponCodeSnapshot ?? undefined,
        lineItems: order.items.map((line) => ({
          productId: line.productId,
          title: line.title,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice),
          imageUrl: line.imageUrl,
        })),
      },
      select: {
        id: true,
        invoiceNumber: true,
        issuedAt: true,
        billedEmail: true,
        currency: true,
        subtotal: true,
        discount: true,
        total: true,
        couponCode: true,
        lineItems: true,
        status: true,
        orderId: true,
      },
    });
    return created;
  });
}

// Feature: update order status field.
export async function updateOrderStatusRepo(
  orderId: number,
  status: OrderStatus,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        items: {
          select: { productId: true, quantity: true },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!current) {
      throw new Error("order_not_found");
    }

    const shouldDeductStock = shouldDeductForTransition(current.status, status);
    const shouldRestockStock = shouldRestockForTransition(
      current.status,
      status,
    );

    if (shouldDeductStock) {
      const productIds = current.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, stock: true },
      });
      const stockByProductId = new Map(products.map((p) => [p.id, p.stock]));

      for (const item of current.items) {
        const stock = stockByProductId.get(item.productId);
        if (stock == null || stock < item.quantity) {
          throw new Error("insufficient_stock_for_status_transition");
        }
      }

      await Promise.all(
        current.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          }),
        ),
      );
    }

    if (shouldRestockStock) {
      // Return stock when transition exits the deducted state.
      await Promise.all(
        current.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
      );
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status },
    });
  });
}

// Feature: update order shipment/tracking fields.
export async function updateOrderShipmentRepo(
  orderId: number,
  input: {
    shippingCarrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    shippedAt?: Date | null;
  },
) {
  // Note: `undefined` preserves DB values; null semantics are validated in service layer.
  return prisma.order.update({
    where: { id: orderId },
    data: {
      shippingCarrier: input.shippingCarrier ?? undefined,
      trackingNumber: input.trackingNumber ?? undefined,
      trackingUrl: input.trackingUrl ?? undefined,
      shippedAt: input.shippedAt ?? undefined,
    },
  });
}
