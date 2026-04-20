/**
 * order action
 * handle order action logic
 */
// provides order actions for checkout creation, stock updates, and admin order access.
import type { OrderStatus } from "@prisma/client";
import {
  buildPaidOrderLinesFromCart,
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
  updateOrderShipmentAdminService,
  updateOrderStatusAdminService,
  validateCartStockForOrder,
} from "./order.service";

export {
  // re-export service primitives so existing API imports remain stable.
  buildPaidOrderLinesFromCart,
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
  updateOrderShipmentAdminService,
  validateCartStockForOrder,
};

export async function updateOrderStatusAdminAction(
  orderId: number,
  status: OrderStatus,
) {
  // thin adapter so API routes and server actions share order service logic.
  return updateOrderStatusAdminService(orderId, status);
}

// No extra order action wrappers are needed; service exports above remain the primary API.
