import type { OrderStatus } from "@prisma/client";
import {
  buildPaidOrderLinesFromCart,
  createPaidOrderAfterCaptureService,
  decrementStockForOrderLinesService,
  getOrderAdminByIdService,
  getOrderForUserByIdService,
  getOrderIdByPayPalOrderIdService,
  listAllOrdersAdminService,
  listOrdersForUserService,
  updateOrderShipmentAdminService,
  updateOrderStatusAdminService,
  validateCartStockForOrder,
} from "./order.service";

export {
  buildPaidOrderLinesFromCart,
  createPaidOrderAfterCaptureService,
  decrementStockForOrderLinesService,
  getOrderAdminByIdService,
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
  return updateOrderStatusAdminService(orderId, status);
}
