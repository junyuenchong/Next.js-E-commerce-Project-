// provides cart server action adapters around cart service operations.
"use server";

import {
  addToCartService,
  clearCartService,
  getCartService,
  getCartWithLiveProductsService,
  getOrCreateCartService,
  mergeGuestCartToUserService,
  removeFromCartService,
  updateCartItemService,
} from "./cart.service";

/**
 * Handles get or create cart action.
 */
export async function getOrCreateCartAction() {
  // every cart mutation assumes a persisted cart id exists first.
  return getOrCreateCartService();
}

/**
 * Handles add to cart action.
 */
export async function addToCartAction(productId: number, quantity: number = 1) {
  // numeric coercion happens here; stock/business validation stays in service.
  return addToCartService(Number(productId), quantity);
}

/**
 * Handles remove from cart action.
 */
export async function removeFromCartAction(productId: number) {
  return removeFromCartService(Number(productId));
}

/**
 * Handles update cart item action.
 */
export async function updateCartItemAction(
  productId: number,
  quantity: number,
) {
  return updateCartItemService(Number(productId), quantity);
}

/**
 * Handles clear cart action.
 */
export async function clearCartAction() {
  return clearCartService();
}

/**
 * Handles merge guest cart to user action.
 */
export async function mergeGuestCartToUserAction() {
  // post-login bridge from anonymous cart session to user-owned cart.
  return mergeGuestCartToUserService();
}

/**
 * Handles get cart action.
 */
export async function getCartAction() {
  return getCartService();
}

/**
 * Handles get cart with live products action.
 */
export async function getCartWithLiveProductsAction() {
  // hydrated read path includes latest product state for checkout/cart UI.
  return getCartWithLiveProductsService();
}

export const getOrCreateCart = getOrCreateCartAction;
export const addToCart = addToCartAction;
export const removeFromCart = removeFromCartAction;
export const updateCartItem = updateCartItemAction;
export const clearCart = clearCartAction;
export const mergeGuestCartToUser = mergeGuestCartToUserAction;
export const getCart = getCartAction;
export const getCartWithLiveProducts = getCartWithLiveProductsAction;
export const addToCartServer = addToCartAction;
export const removeFromCartServer = removeFromCartAction;
export const clearCartServer = clearCartAction;
