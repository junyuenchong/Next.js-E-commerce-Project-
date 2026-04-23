// Module: Provides cart server action adapters around cart service operations.
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
 * Ensure the current session has a cart and return it.
 */
export async function getOrCreateCartAction() {
  // every cart mutation assumes a persisted cart id exists first.
  return getOrCreateCartService();
}

/**
 * Add a product to the current cart.
 */
export async function addToCartAction(productId: number, quantity: number = 1) {
  // numeric coercion happens here; stock/business validation stays in service.
  return addToCartService(Number(productId), quantity);
}

/**
 * Remove a product line from the current cart.
 */
export async function removeFromCartAction(productId: number) {
  return removeFromCartService(Number(productId));
}

/**
 * Update quantity for a cart line item.
 */
export async function updateCartItemAction(
  productId: number,
  quantity: number,
) {
  return updateCartItemService(Number(productId), quantity);
}

/**
 * Remove all items from the current cart.
 */
export async function clearCartAction() {
  return clearCartService();
}

/**
 * Merge guest cart content into the signed-in user's cart.
 */
export async function mergeGuestCartToUserAction() {
  // post-login bridge from anonymous cart session to user-owned cart.
  return mergeGuestCartToUserService();
}

/**
 * Return the current cart snapshot.
 */
export async function getCartAction() {
  return getCartService();
}

/**
 * Return cart lines with latest product state.
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
