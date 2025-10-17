"use client";

import React, { useEffect } from "react";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from '@/app/user/hooks/useCart';
import { useSocket } from '@/lib/socket/SocketContext';

type CartItem = {
  id: string;
  quantity: number;
  title: string;
  price: number;
  image?: string;
  liveProduct?: { price?: number; title?: string; imageUrl?: string };
};

// Helper function to format price in RM
const formatPriceRM = (price: number): string => {
  return `RM ${price.toFixed(2)}`;
};

const CartPage = () => {
  const { cart, isLoading, mutate } = useCart();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !cart?.id) return;
    socket.emit('join', `cart:${cart.id}`);
    const handleCartUpdate = () => mutate();
    socket.on('cart_updated', handleCartUpdate);
    return () => {
      socket.emit('leave', `cart:${cart.id}`);
      socket.off('cart_updated', handleCartUpdate);
    };
  }, [socket, isConnected, cart?.id, mutate]);

  useEffect(() => {
    if (!socket) return;
    const handleProductsUpdate = () => mutate();
    socket.on('products_updated', handleProductsUpdate);
    return () => {
      socket.off('products_updated', handleProductsUpdate);
      return;
    };
  }, [socket, mutate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!cart?.items || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto py-16 px-4">
          <div className="text-center">
            <ShoppingCart className="mx-auto h-24 w-24 text-gray-400 mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
            <p className="text-gray-600 mb-8">Looks like you haven&apos;t added any items to your cart yet.</p>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = cart.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
  const totalPrice = cart.items.reduce((sum: number, item: CartItem) => sum + (item.liveProduct?.price ?? item.price) * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6">Cart Items ({totalItems})</h2>

                <div className="space-y-6">
                  {cart.items.map((item: CartItem) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      {/* Product Image */}
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image
                          src={item.liveProduct?.imageUrl || item.image || '/placeholder.png'}
                          alt={item.liveProduct?.title || item.title}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{item.liveProduct?.title || item.title}</h3>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          {formatPriceRM(item.liveProduct?.price ?? item.price)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {}}
                          disabled={item.quantity <= 1}
                          className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => {}}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => {}}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full disabled:opacity-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-6">Cart Summary</h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({totalItems} items)</span>
                  <span className="font-medium">{formatPriceRM(totalPrice)}</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">{formatPriceRM(totalPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage; 