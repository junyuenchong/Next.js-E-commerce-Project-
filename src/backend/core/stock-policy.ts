// Stock deduction strategy switch:
// - PAID: Shopee-like (deduct once when payment is persisted)
// - FULFILLED: deduct when order enters fulfilled
import type { OrderStatus } from "@prisma/client";

export type StockDeductMode = "PAID" | "FULFILLED";
export type StockMutationAction = "NONE" | "DEDUCT" | "RESTOCK";

export function resolveStockDeductMode(): StockDeductMode {
  const raw = process.env.STOCK_DEDUCT_MODE?.trim().toUpperCase();
  return raw === "PAID" ? "PAID" : "FULFILLED";
}

export function deductStockOnPaid() {
  return resolveStockDeductMode() === "PAID";
}

export function deductStockOnFulfilled() {
  return resolveStockDeductMode() === "FULFILLED";
}

function isStockDeductedForStatus(status: OrderStatus): boolean {
  if (deductStockOnPaid()) {
    // In paid mode, stock is considered deducted after payment unless cancelled.
    return status !== "pending" && status !== "cancelled";
  }
  // In fulfillment mode, stock is deducted only at fulfillment.
  return status === "fulfilled";
}

export function shouldDeductForTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
) {
  return (
    !isStockDeductedForStatus(fromStatus) && isStockDeductedForStatus(toStatus)
  );
}

export function shouldRestockForTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
) {
  return (
    isStockDeductedForStatus(fromStatus) && !isStockDeductedForStatus(toStatus)
  );
}

export function resolveStockMutationForTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): StockMutationAction {
  if (shouldDeductForTransition(fromStatus, toStatus)) return "DEDUCT";
  if (shouldRestockForTransition(fromStatus, toStatus)) return "RESTOCK";
  return "NONE";
}
