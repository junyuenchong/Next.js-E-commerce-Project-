import type { OrderListItem } from "@/shared/types";

type UserFacingOrderStatus = OrderListItem["status"] | string;

// Keep user-facing order labels consistent across list and detail views.
// map internal lifecycle names to customer-facing status labels.
export function getUserOrderStatusLabel(status: UserFacingOrderStatus): string {
  switch (String(status).toLowerCase()) {
    case "pending":
      return "Payment pending";
    case "paid":
      return "Paid";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "fulfilled":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return String(status);
  }
}
