// Feature: Provides cart server action adapters around cart service operations.
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

// Guard: ensure cart exists before mutations.
export async function getOrCreateCartAction() {
  // Guard: every cart mutation assumes a persisted cart id exists first.
  return getOrCreateCartService();
}

// Feature: add item to current session cart.
export async function addToCartAction(productId: number, quantity: number = 1) {
  // Note: numeric coercion happens here; stock/business validation stays in service.
  return addToCartService(Number(productId), quantity);
}

// Feature: remove item from current session cart.
export async function removeFromCartAction(productId: number) {
  return removeFromCartService(Number(productId));
}

// Feature: set specific cart line quantity for current session.
export async function updateCartItemAction(
  productId: number,
  quantity: number,
) {
  return updateCartItemService(Number(productId), quantity);
}

// Feature: empty current session cart.
export async function clearCartAction() {
  return clearCartService();
}

// Feature: merge guest cart into authenticated cart after login.
export async function mergeGuestCartToUserAction() {
  // Feature: post-login bridge from anonymous cart session to user-owned cart.
  return mergeGuestCartToUserService();
}

// Feature: read current session cart (may be null).
export async function getCartAction() {
  return getCartService();
}

// Feature: read current cart with live product data for UI rendering.
export async function getCartWithLiveProductsAction() {
  // Note: hydrated read path includes latest product state for checkout/cart UI.
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
