import type { OrderListItem } from "@/shared/types";

type UserFacingOrderStatus = OrderListItem["status"] | string;

// Keep user-facing order labels consistent across list and detail views.
// Note: this intentionally maps internal lifecycle names (e.g. fulfilled) to customer copy (Completed).
export function getUserOrderStatusLabel(status: UserFacingOrderStatus): string {
  switch (String(status).toLowerCase()) {
    case "pending":
      return "Pending";
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
