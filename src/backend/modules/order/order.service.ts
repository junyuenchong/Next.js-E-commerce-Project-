// Feature: Encapsulates order lifecycle services for checkout conversion, stock updates, and admin views.
import type { OrderStatus } from "@prisma/client";
import { publishAdminOrderEvent } from "@/backend/modules/admin-events";
import {
  ensureInvoiceForOrderRepo,
  createPaidOrderRepo,
  decrementStockForOrderLinesRepo,
  findOrderAdminByIdRepo,
  findOrderByPayPalIdRepo,
  findOrderForUserByIdRepo,
  listAllOrdersAdminRepo,
  listOrdersForUserRepo,
  updateOrderShipmentRepo,
  updateOrderStatusRepo,
  findInvoiceByOrderRepo,
  findInvoiceByUserAndOrderRepo,
} from "./order.repo";
import { moneyToNumber } from "@/backend/core/money";
import type { CreatePaidOrderInput } from "@/shared/types";

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
  // Note: same relation as `product` from getCartWithLiveProductsService (alias for UI).
  liveProduct?: { stock?: number } | null;
};

function lineStock(item: CartLineWithProduct): number | undefined {
  // Guard: support both `product` and legacy `liveProduct` shapes during migration.
  const p = item.product ?? item.liveProduct;
  const s = p?.stock;
  return typeof s === "number" ? s : undefined;
}

export function validateCartStockForOrder(
  items: CartLineWithProduct[],
): { ok: true } | { ok: false; productId: number } {
  // Guard: fail fast on first insufficient item for actionable productId errors.
  for (const item of items) {
    const stock = lineStock(item);
    if (stock === undefined || stock < item.quantity) {
      return { ok: false, productId: item.productId };
    }
  }
  return { ok: true };
}

export function buildPaidOrderLinesFromCart(
  items: CartLineWithProduct[],
): CreatePaidOrderInput["lines"] {
  // Feature: normalize cart snapshot into immutable order-line persistence records.
  return items.map((item) => {
    const p = item.product;
    const unitPrice = moneyToNumber(p?.price ?? item.price ?? 0);
    const title = p?.title ?? item.title ?? `Product #${item.productId}`;
    const imageUrl = p?.imageUrl ?? item.image ?? null;
    return {
      productId: item.productId,
      quantity: item.quantity,
      title,
      unitPrice,
      imageUrl,
    };
  });
}

// Feature: create paid order record after successful payment capture.
export async function createPaidOrderAfterCaptureService(
  input: CreatePaidOrderInput,
  options?: { skipStockDecrement?: boolean },
) {
  // Guard: persistence layer assumes at least one order line exists.
  if (!input.lines.length) {
    throw new Error("Order must contain at least one line.");
  }
  return createPaidOrderRepo(input, options);
}

// Feature: decrement product stock for purchased order lines.
export async function decrementStockForOrderLinesService(
  lines: { productId: number; quantity: number }[],
) {
  return decrementStockForOrderLinesRepo(lines);
}

// Feature: list user orders with cursor pagination.
export async function listOrdersForUserService(
  userId: number,
  cursorId?: number,
  take?: number,
) {
  return listOrdersForUserRepo(userId, cursorId, take);
}

// Feature: resolve internal order id from PayPal order id.
export async function getOrderIdByPayPalOrderIdService(
  paypalOrderId: string,
): Promise<number | null> {
  const row = await findOrderByPayPalIdRepo(paypalOrderId);
  return row?.id ?? null;
}

// Feature: list admin dashboard orders with optional search.
export async function listAllOrdersAdminService(
  cursorId?: number,
  take?: number,
  q?: string,
) {
  return listAllOrdersAdminRepo(cursorId, take, q);
}

// Guard: fetch single admin-view order and return null for invalid ids.
export async function getOrderAdminByIdService(id: number) {
  // Guard: reject invalid numeric ids early to avoid unnecessary DB queries.
  if (!Number.isFinite(id) || id < 1) return null;
  return findOrderAdminByIdRepo(id);
}

// Feature: update order status and publish admin realtime event.
export async function updateOrderStatusAdminService(
  orderId: number,
  status: OrderStatus,
) {
  // Feature: always emit admin event so dashboard/list views stay realtime.
  const order = await updateOrderStatusRepo(orderId, status);
  await publishAdminOrderEvent({
    kind: "updated",
    id: orderId,
    status,
  });
  return order;
}

// Feature: update shipment fields and publish admin realtime event.
export async function updateOrderShipmentAdminService(
  orderId: number,
  input: {
    shippingCarrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  },
) {
  // Guard: any non-empty shipment metadata implies shipment start timestamp.
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
    // Feature: auto-promote non-cancelled orders to shipped when shipment data saves.
    await updateOrderStatusAdminService(orderId, "shipped");
  }

  await publishAdminOrderEvent({
    kind: "updated",
    id: orderId,
  });

  return order;
}

// Feature: fetch single user order including line items.
export async function getOrderForUserByIdService(
  userId: number,
  orderId: number,
) {
  return findOrderForUserByIdRepo(userId, orderId);
}

export async function getInvoiceForUserByOrderIdService(
  userId: number,
  orderId: number,
) {
  return findInvoiceByUserAndOrderRepo(userId, orderId);
}

export async function getInvoiceByOrderIdService(orderId: number) {
  return findInvoiceByOrderRepo(orderId);
}

export async function getOrCreateInvoiceByOrderIdService(orderId: number) {
  return ensureInvoiceForOrderRepo(orderId);
}
