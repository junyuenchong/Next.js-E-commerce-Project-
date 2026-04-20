/**
 * stock policy
 * handle when to deduct or restock stock
 */
import type { OrderStatus } from "@prisma/client";

export type StockDeductMode = "PAID" | "FULFILLED";
export type StockMutationAction = "NONE" | "DEDUCT" | "RESTOCK";

/**
 * read stock mode from env
 * default is FULFILLED
 */
export function resolveStockDeductMode(): StockDeductMode {
  const raw = process.env.STOCK_DEDUCT_MODE?.trim().toUpperCase();
  return raw === "PAID" ? "PAID" : "FULFILLED";
}

/**
 * return true when stock should deduct on paid
 */
export function deductStockOnPaid() {
  return resolveStockDeductMode() === "PAID";
}

/**
 * return true when stock should deduct on fulfilled
 */
export function deductStockOnFulfilled() {
  return resolveStockDeductMode() === "FULFILLED";
}

/**
 * check if stock is already deducted for this status
 */
function isStockDeductedForStatus(status: OrderStatus): boolean {
  if (deductStockOnPaid()) {
    // in paid mode, stock is deducted after payment
    return status !== "pending" && status !== "cancelled";
  }
  // in fulfilled mode, only fulfilled status deducts stock
  return status === "fulfilled";
}

/**
 * return true when status change should deduct stock
 */
export function shouldDeductForTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
) {
  return (
    !isStockDeductedForStatus(fromStatus) && isStockDeductedForStatus(toStatus)
  );
}

/**
 * return true when status change should restock stock
 */
export function shouldRestockForTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
) {
  return (
    isStockDeductedForStatus(fromStatus) && !isStockDeductedForStatus(toStatus)
  );
}

/**
 * decide stock action for status transition
 */
export function resolveStockMutationForTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): StockMutationAction {
  if (shouldDeductForTransition(fromStatus, toStatus)) return "DEDUCT";
  if (shouldRestockForTransition(fromStatus, toStatus)) return "RESTOCK";
  return "NONE";
}
