import type { OrderStatus } from "@prisma/client";
import { publishAdminOrderEvent } from "@/backend/modules/admin-events";
import {
  createPaidOrderRepo,
  decrementStockForOrderLinesRepo,
  findOrderAdminByIdRepo,
  findOrderByPayPalIdRepo,
  findOrderForUserByIdRepo,
  listAllOrdersAdminRepo,
  listOrdersForUserRepo,
  updateOrderShipmentRepo,
  updateOrderStatusRepo,
} from "./order.repo";
import { moneyToNumber } from "@/backend/core/money";
import type { CreatePaidOrderInput } from "@/shared/types/order";

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
  /** Same relation as `product` from getCartWithLiveProductsService (alias for UI). */
  liveProduct?: { stock?: number } | null;
};

function lineStock(item: CartLineWithProduct): number | undefined {
  const p = item.product ?? item.liveProduct;
  const s = p?.stock;
  return typeof s === "number" ? s : undefined;
}

export function validateCartStockForOrder(
  items: CartLineWithProduct[],
): { ok: true } | { ok: false; productId: number } {
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

export async function createPaidOrderAfterCaptureService(
  input: CreatePaidOrderInput,
  options?: { skipStockDecrement?: boolean },
) {
  if (!input.lines.length) {
    throw new Error("Order must contain at least one line.");
  }
  return createPaidOrderRepo(input, options);
}

export async function decrementStockForOrderLinesService(
  lines: { productId: number; quantity: number }[],
) {
  return decrementStockForOrderLinesRepo(lines);
}

export async function listOrdersForUserService(
  userId: number,
  cursorId?: number,
  take?: number,
) {
  return listOrdersForUserRepo(userId, cursorId, take);
}

export async function getOrderIdByPayPalOrderIdService(
  paypalOrderId: string,
): Promise<number | null> {
  const row = await findOrderByPayPalIdRepo(paypalOrderId);
  return row?.id ?? null;
}

export async function listAllOrdersAdminService(
  cursorId?: number,
  take?: number,
  q?: string,
) {
  return listAllOrdersAdminRepo(cursorId, take, q);
}

export async function getOrderAdminByIdService(id: number) {
  if (!Number.isFinite(id) || id < 1) return null;
  return findOrderAdminByIdRepo(id);
}

export async function updateOrderStatusAdminService(
  orderId: number,
  status: OrderStatus,
) {
  const order = await updateOrderStatusRepo(orderId, status);
  await publishAdminOrderEvent({
    kind: "updated",
    id: orderId,
    status,
  });
  return order;
}

export async function updateOrderShipmentAdminService(
  orderId: number,
  input: {
    shippingCarrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
  },
) {
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
    await updateOrderStatusAdminService(orderId, "shipped");
  }

  await publishAdminOrderEvent({
    kind: "updated",
    id: orderId,
  });

  return order;
}

export async function getOrderForUserByIdService(
  userId: number,
  orderId: number,
) {
  return findOrderForUserByIdRepo(userId, orderId);
}
