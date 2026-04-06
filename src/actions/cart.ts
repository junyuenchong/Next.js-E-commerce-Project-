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
} from "@/modules/cart/cart.service";

export async function getOrCreateCart() {
  return getOrCreateCartService();
}

// Add an item to the cart
export async function addToCart(productId: number, quantity: number = 1) {
  return addToCartService(Number(productId), quantity);
}

// Remove from cart server action
export async function removeFromCart(productId: number) {
  return removeFromCartService(Number(productId));
}

// Update cart item quantity server action
export async function updateCartItem(productId: number, quantity: number) {
  return updateCartItemService(Number(productId), quantity);
}

// Clear the cart
export async function clearCart() {
  return clearCartService();
}

// Merge guest cart into user cart after login
export async function mergeGuestCartToUser() {
  return mergeGuestCartToUserService();
}

// Fetch cart for user or guest, but do NOT create a new one
export async function getCart() {
  return getCartService();
}

export async function getCartWithLiveProducts() {
  return getCartWithLiveProductsService();
}

// Server action wrappers for direct import
export async function addToCartServer(productId: number, quantity: number = 1) {
  return addToCart(productId, quantity);
}

export async function removeFromCartServer(productId: number) {
  return removeFromCart(productId);
}

export async function clearCartServer() {
  return clearCart();
}
