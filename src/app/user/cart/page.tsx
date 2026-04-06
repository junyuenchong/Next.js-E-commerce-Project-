"use client";

import React, { useCallback, useMemo } from "react";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/app/user/hooks/useCart";
import CartItemRow from "@/app/user/components/Cart/CartItemRow";
import { clearCart, removeFromCart, updateCartItem } from "@/actions/cart";

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

  const summary = useMemo(() => {
    const items = ((cart?.items ?? []) as CartItem[]) ?? [];
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce(
      (sum, item) =>
        sum + (item.liveProduct?.price ?? item.price) * item.quantity,
      0,
    );
    return { totalItems, totalPrice };
  }, [cart?.items]);

  const handleUpdateQuantity = useCallback(
    async (productId: number, newQuantity: number) => {
      if (newQuantity < 1) return;
      await updateCartItem(productId, newQuantity);
      mutate();
    },
    [mutate],
  );

  const handleRemoveItem = useCallback(
    async (productId: number) => {
      await removeFromCart(productId);
      mutate();
    },
    [mutate],
  );

  const handleClearCart = useCallback(async () => {
    if (!confirm("Are you sure you want to clear your cart?")) return;
    await clearCart();
    mutate();
  }, [mutate]);

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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Your cart is empty
            </h1>
            <p className="text-gray-600 mb-8">
              Looks like you haven&apos;t added any items to your cart yet.
            </p>
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
                <h2 className="text-xl font-semibold mb-6">
                  Cart Items ({summary.totalItems})
                </h2>

                <div className="space-y-6">
                  {cart.items.map((item: CartItem) => (
                    <CartItemRow
                      key={item.id}
                      item={
                        item as unknown as {
                          id: string;
                          productId: number;
                          quantity: number;
                          title: string;
                          price: number;
                          image?: string;
                          liveProduct?: {
                            price?: number;
                            title?: string;
                            imageUrl?: string;
                          };
                        }
                      }
                      formatPrice={formatPriceRM}
                      onDecrease={(productId, quantity) =>
                        handleUpdateQuantity(productId, quantity - 1)
                      }
                      onIncrease={(productId, quantity) =>
                        handleUpdateQuantity(productId, quantity + 1)
                      }
                      onRemove={handleRemoveItem}
                    />
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
                  <span className="text-gray-600">
                    Subtotal ({summary.totalItems} items)
                  </span>
                  <span className="font-medium">
                    {formatPriceRM(summary.totalPrice)}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">
                      {formatPriceRM(summary.totalPrice)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue Shopping
                </Link>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="w-full inline-flex items-center justify-center px-6 py-3 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
