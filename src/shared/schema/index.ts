export * as adminSchema from "./admin";
export * as userSchema from "./user";

// Convenience re-exports for "all-in-one" imports.
export * from "./admin";
export * from "./user";

// Domain-level schemas (backend + frontend).
export * from "./access-control";
export * from "./cart";
export * from "./category";
export * from "./coupon";
export * from "./order";
export * from "./product";
export * from "./review";
export * from "./wishlist";
