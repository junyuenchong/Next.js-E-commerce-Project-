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

export async function getOrCreateCartAction() {
  return getOrCreateCartService();
}

export async function addToCartAction(productId: number, quantity: number = 1) {
  return addToCartService(Number(productId), quantity);
}

export async function removeFromCartAction(productId: number) {
  return removeFromCartService(Number(productId));
}

export async function updateCartItemAction(
  productId: number,
  quantity: number,
) {
  return updateCartItemService(Number(productId), quantity);
}

export async function clearCartAction() {
  return clearCartService();
}

export async function mergeGuestCartToUserAction() {
  return mergeGuestCartToUserService();
}

export async function getCartAction() {
  return getCartService();
}

export async function getCartWithLiveProductsAction() {
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
