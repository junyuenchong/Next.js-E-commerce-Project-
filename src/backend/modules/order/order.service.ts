// Order services for lifecycle rules and admin/user workflows.
import type { OrderStatus } from "@prisma/client";
import { publishAdminOrderEvent } from "@/backend/modules/admin-events";
import { isPositiveInt } from "@/backend/shared/number";
import {
  createPendingOrderRepo,
  ensureInvoiceForOrderRepo,
  createPaidOrderRepo,
  decrementStockForOrderLinesRepo,
  findOrderAdminByIdRepo,
  findOrderByPayPalIdRepo,
  findOrderForUserByIdRepo,
  listAllOrdersAdminRepo,
  listOrdersForUserRepo,
  markOrderReceivedByUserRepo,
  updateOrderShipmentRepo,
  updateOrderStatusRepo,
  findInvoiceByOrderRepo,
  findInvoiceByUserAndOrderRepo,
} from "./order.repo";
import { moneyToNumber } from "@/backend/core/money";
import type {
  CreatePaidOrderInput,
  CreatePendingOrderInput,
} from "@/shared/types";

type CartLineWithProduct = {
  productId: number;
  quantity: number;
  title?: string | null;
  price?: number | null;
  image?: string | null;
  product?: {
    stock: number;
    title: string;
    price: number;
    imageUrl: string | null;
  } | null;
  // same relation as `product` from getCartWithLiveProductsService (alias for UI).
  liveProduct?: { stock?: number } | null;
};

function lineStock(item: CartLineWithProduct): number | undefined {
  // support both `product` and legacy `liveProduct` shapes during migration.
  const productSnapshot = item.product ?? item.liveProduct;
  const availableStock = productSnapshot?.stock;
  return typeof availableStock === "number" ? availableStock : undefined;
}

export function validateCartStockForOrder(
  items: CartLineWithProduct[],
): { ok: true } | { ok: false; productId: number } {
  // fail fast on first insufficient item for actionable productId errors.
  for (const item of items) {
    const stock = lineStock(item);
    if (stock === undefined || stock < item.quantity) {
      return { ok: false, productId: item.productId };
    }
  }
  return { ok: true };
}

/**
 * Build paid-order line items from a cart snapshot.
 */
export function buildPaidOrderLinesFromCart(
  items: CartLineWithProduct[],
): CreatePaidOrderInput["lines"] {
  // normalize cart snapshot into immutable order-line persistence records.
  return items.map((item) => {
    const productSnapshot = item.product;
    const unitPrice = moneyToNumber(productSnapshot?.price ?? item.price ?? 0);
    const title =
      productSnapshot?.title ?? item.title ?? `Product #${item.productId}`;
    const imageUrl = productSnapshot?.imageUrl ?? item.image ?? null;
    return {
      productId: item.productId,
      quantity: item.quantity,
      title,
      unitPrice,
      imageUrl,
    };
  });
}

/**
 * Create (or upgrade) a paid order record after successful payment capture.
 */
export async function createPaidOrderAfterCaptureService(
  input: CreatePaidOrderInput,
  options?: { skipStockDecrement?: boolean },
) {
  // persistence layer assumes at least one order line exists.
  if (!input.lines.length) {
    throw new Error("Order must contain at least one line.");
  }
  return createPaidOrderRepo(input, options);
}

/**
 * Create (or upsert) a pending order before payment capture.
 */
export async function createPendingOrderBeforeCaptureService(
  input: CreatePendingOrderInput,
) {
  if (!input.lines.length) {
    throw new Error("Order must contain at least one line.");
  }
  return createPendingOrderRepo(input);
}

/**
 * Decrement product stock for purchased order lines.
 */
export async function decrementStockForOrderLinesService(
  lines: { productId: number; quantity: number }[],
) {
  return decrementStockForOrderLinesRepo(lines);
}

/**
 * List user orders with cursor pagination (optionally filtered by status).
 */
export async function listOrdersForUserService(
  userId: number,
  cursorId?: number,
  take?: number,
  status?: OrderStatus,
) {
  return listOrdersForUserRepo(userId, cursorId, take, status);
}

/**
 * Resolve internal order id from PayPal order id.
 */
export async function getOrderIdByPayPalOrderIdService(
  paypalOrderId: string,
): Promise<number | null> {
  const row = await findOrderByPayPalIdRepo(paypalOrderId);
  return row?.id ?? null;
}

/**
 * List admin dashboard orders with optional search.
 */
export async function listAllOrdersAdminService(
  cursorId?: number,
  take?: number,
  q?: string,
) {
  return listAllOrdersAdminRepo(cursorId, take, q);
}

/**
 * Fetch single admin-view order and return null for invalid ids.
 */
export async function getOrderAdminByIdService(id: number) {
  // reject invalid numeric ids early to avoid unnecessary DB queries.
  if (!isPositiveInt(id)) return null;
  return findOrderAdminByIdRepo(id);
}

/**
 * Update order status and publish admin realtime event.
 */
export async function updateOrderStatusAdminService(
  orderId: number,
  status: OrderStatus,
) {
  // always emit admin event so dashboard/list views stay realtime.
  const order = await updateOrderStatusRepo(orderId, status);
  await publishAdminOrderEvent({
    kind: "updated",
    id: orderId,
    status,
  });
  return order;
}

/**
 * Update shipment fields and publish admin realtime event.
 */
export async function updateOrderShipmentAdminService(
  orderId: number,
  input: {
    shippingCarrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  },
) {
  // any non-empty shipment metadata implies shipment start timestamp.
  const shippedAt =
    (input.trackingNumber && input.trackingNumber.trim()) ||
    (input.trackingUrl && input.trackingUrl.trim()) ||
    (input.shippingCarrier && input.shippingCarrier.trim())
      ? new Date()
      : undefined;

  const order = await updateOrderShipmentRepo(orderId, {
    ...input,
    shippedAt,
  });

  if (shippedAt && order.status !== "cancelled" && order.status !== "shipped") {
    // auto-promote non-cancelled orders to shipped when shipment data saves.
    await updateOrderStatusAdminService(orderId, "shipped");
  }

  await publishAdminOrderEvent({
    kind: "updated",
    id: orderId,
  });

  return order;
}

/**
 * Fetch single user order including line items.
 */
export async function getOrderForUserByIdService(
  userId: number,
  orderId: number,
) {
  return findOrderForUserByIdRepo(userId, orderId);
}

/**
 * Allow user to mark an order as received when receivable.
 */
export async function markOrderReceivedByUserService(params: {
  userId: number;
  orderId: number;
}) {
  if (!isPositiveInt(params.userId)) {
    return { ok: false as const, error: "invalid_user" };
  }
  if (!isPositiveInt(params.orderId)) {
    return { ok: false as const, error: "invalid_order" };
  }
  const result = await markOrderReceivedByUserRepo(params);
  if (!result.ok) {
    return { ok: false as const, error: "not_receivable" };
  }
  return { ok: true as const };
}

/**
 * Get invoice for a user by order id.
 */
export async function getInvoiceForUserByOrderIdService(
  userId: number,
  orderId: number,
) {
  return findInvoiceByUserAndOrderRepo(userId, orderId);
}

/**
 * Get invoice by order id.
 */
export async function getInvoiceByOrderIdService(orderId: number) {
  return findInvoiceByOrderRepo(orderId);
}

/**
 * Get invoice by order id, creating one when missing.
 */
export async function getOrCreateInvoiceByOrderIdService(orderId: number) {
  return ensureInvoiceForOrderRepo(orderId);
}
