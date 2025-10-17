import { z } from "zod";

// ============================================================================
// CART VALIDATORS
// ============================================================================

/**
 * Schema for adding items to cart
 */
export const addToCartSchema = z.object({
  cartId: z.string().optional(),
  productId: z.number().int().positive("Product ID must be a positive integer"),
  quantity: z.number().int().positive().max(100, "Quantity must be between 1 and 100").default(1),
});

/**
 * Schema for updating cart item quantity
 */
export const updateCartItemSchema = z.object({
  cartId: z.string().min(1, "Cart ID is required"),
  productId: z.number().int().positive("Product ID must be a positive integer"),
  quantity: z.number().int().min(0).max(100, "Quantity must be between 0 and 100"),
});

/**
 * Schema for removing items from cart
 */
export const removeFromCartSchema = z.object({
  cartId: z.string().min(1, "Cart ID is required"),
  productId: z.number().int().positive("Product ID must be a positive integer"),
});

/**
 * Schema for clearing cart
 */
export const clearCartSchema = z.object({
  cartId: z.string().min(1, "Cart ID is required"),
});

/**
 * Schema for cart ID validation
 */
export const cartIdSchema = z.object({
  cartId: z.string().min(1, "Cart ID is required"),
});

/**
 * Schema for cart item data
 */
export const cartItemSchema = z.object({
  productId: z.number().int().positive("Product ID must be a positive integer"),
  title: z.string().min(1, "Product title is required"),
  price: z.number().positive("Price must be positive"),
  image: z.string().optional(),
  quantity: z.number().int().positive().max(100, "Quantity must be between 1 and 100"),
});

/**
 * Schema for cart status updates
 */
export const cartStatusSchema = z.object({
  cartId: z.string().min(1, "Cart ID is required"),
  status: z.enum(["ACTIVE", "ABANDONED", "EXPIRED", "CONVERTED"]),
});

/**
 * Schema for applying coupons to cart
 */
export const applyCouponSchema = z.object({
  cartId: z.string().min(1, "Cart ID is required"),
  couponCode: z.string().min(1, "Coupon code is required").max(50, "Coupon code too long"),
});

/**
 * Schema for cart notes
 */
export const cartNotesSchema = z.object({
  cartId: z.string().min(1, "Cart ID is required"),
  notes: z.string().max(500, "Notes too long").optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;
export type ClearCartInput = z.infer<typeof clearCartSchema>;
export type CartIdInput = z.infer<typeof cartIdSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
export type CartStatusInput = z.infer<typeof cartStatusSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type CartNotesInput = z.infer<typeof cartNotesSchema>; 