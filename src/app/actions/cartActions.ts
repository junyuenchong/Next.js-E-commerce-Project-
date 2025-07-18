"use server";
import { addToCart, removeFromCart, clearCart } from '@/actions/cart-actions';

export async function addToCartServer(productId: number, quantity: number = 1) {
  return addToCart(productId, quantity);
}

export async function removeFromCartServer(productId: number) {
  return removeFromCart(productId);
}

export async function clearCartServer() {
  return clearCart();
} 