"use client";

import React, { useEffect } from 'react';
import { useCart } from '@/app/user/hooks/useCart';
import { useSocket } from '@/lib/socket/SocketContext';
import { Trash2, Minus, Plus, ShoppingCart, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { updateCartItem, removeFromCart, clearCart as clearCartAction } from '@/actions/cart-actions';

// Helper function to format price in RM
const formatPriceRM = (price: number | null | undefined): string => {
  if (typeof price !== 'number' || isNaN(price)) return 'RM 0.00';
  return `RM ${price.toFixed(2)}`;
};

type CartItem = {
  id: string;
  productId: number;
  quantity: number;
  title: string;
  price: number;
  image?: string;
  liveProduct?: { price?: number; title?: string; imageUrl?: string };
};

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const CartSidebar = ({ isOpen, onClose }: CartSidebarProps) => {
  const { cart, mutate } = useCart();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !cart?.id) return;
    socket.emit('join', `cart:${cart.id}`);
    const handleCartUpdate = () => {
      console.log('Received cart_updated');
      mutate();
    };
    socket.on('cart_updated', handleCartUpdate);
    return () => {
      socket.emit('leave', `cart:${cart.id}`);
      socket.off('cart_updated', handleCartUpdate);
    };
  }, [socket, isConnected, cart?.id, mutate]);

  // Listen for product updates and refresh cart for real-time product info
  useEffect(() => {
    if (!socket) return;
    const handleProductsUpdate = () => mutate();
    socket.on('products_updated', handleProductsUpdate);
    return () => {
      socket.off('products_updated', handleProductsUpdate);
      return;
    };
  }, [socket, mutate]);

  const handleUpdateQuantity = async (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateCartItem(productId, newQuantity);
    mutate();
  };

  const handleRemoveItem = async (productId: number) => {
    await removeFromCart(productId);
    mutate();
  };

  const handleClearCart = async () => {
    if (!confirm('Are you sure you want to clear your cart?')) return;
    await clearCartAction();
    mutate();
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Shopping Cart</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col h-full">
          {(!cart?.items || cart.items.length === 0) ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-6">Looks like you haven&apos;t added any items to your cart yet.</p>
              <Link 
                href="/"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {cart.items.map((item: CartItem) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <Image
                          src={item.liveProduct?.imageUrl || item.image || '/placeholder.png'}
                          alt={item.liveProduct?.title || item.title}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm truncate">{item.liveProduct?.title || item.title}</h3>
                        <p className="text-sm font-bold text-blue-600 mt-1">
                          {formatPriceRM(item.liveProduct?.price ?? item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal ({cart.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)} items)</span>
                    <span className="font-medium">{formatPriceRM(cart.items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0))}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-blue-600">{formatPriceRM(cart.items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0))}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Link
                      href="/"
                      onClick={onClose}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Continue Shopping
                    </Link>
                    <button
                      onClick={handleClearCart}
                      className="w-full inline-flex items-center justify-center px-4 py-2 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Clear Cart
                    </button>
                  </div>
                  <div className="text-center text-xs text-gray-500">
                    Checkout functionality has been removed
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartSidebar; 