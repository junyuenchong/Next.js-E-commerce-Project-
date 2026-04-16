export type Permission =
  | "user.read"
  | "user.update"
  | "user.ban"
  | "order.read"
  | "order.update"
  | "order.refund"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "coupon.read"
  | "coupon.manage"
  | "audit.read";

export type AppPermissionRole = "super_admin" | "admin" | "staff";
