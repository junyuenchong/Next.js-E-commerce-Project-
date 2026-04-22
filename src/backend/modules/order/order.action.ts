// Order action layer: route-facing adapters over order services.
import type { OrderStatus } from "@prisma/client";
import {
  buildPaidOrderLinesFromCart,
  createPendingOrderBeforeCaptureService,
  createPaidOrderAfterCaptureService,
  decrementStockForOrderLinesService,
  getOrderAdminByIdService,
  getInvoiceByOrderIdService,
  getOrCreateInvoiceByOrderIdService,
  getInvoiceForUserByOrderIdService,
  getOrderForUserByIdService,
  getOrderIdByPayPalOrderIdService,
  listAllOrdersAdminService,
  listOrdersForUserService,
  markOrderReceivedByUserService,
  updateOrderShipmentAdminService,
  updateOrderStatusAdminService,
  validateCartStockForOrder,
} from "./order.service";

export {
  // re-export service primitives so existing API imports remain stable.
  buildPaidOrderLinesFromCart,
  createPendingOrderBeforeCaptureService,
  createPaidOrderAfterCaptureService,
  decrementStockForOrderLinesService,
  getOrderAdminByIdService,
  getInvoiceByOrderIdService,
  getOrCreateInvoiceByOrderIdService,
  getInvoiceForUserByOrderIdService,
  getOrderForUserByIdService,
  getOrderIdByPayPalOrderIdService,
  listAllOrdersAdminService,
  listOrdersForUserService,
  markOrderReceivedByUserService,
  updateOrderShipmentAdminService,
  validateCartStockForOrder,
};

/**
 * Handles update order status admin action.
 */
export async function updateOrderStatusAdminAction(
  orderId: number,
  status: OrderStatus,
) {
  // thin adapter so API routes and server actions share order service logic.
  return updateOrderStatusAdminService(orderId, status);
}

// No extra order action wrappers are needed; service exports above remain the primary API.
