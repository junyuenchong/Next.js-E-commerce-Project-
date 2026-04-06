"use client";

import React, { memo, useCallback } from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import Image from "next/image";

export type CartItemRowData = {
  id: string;
  productId: number;
  quantity: number;
  title: string;
  price: number;
  image?: string;
  liveProduct?: { price?: number; title?: string; imageUrl?: string };
};

interface CartItemRowProps {
  item: CartItemRowData;
  compact?: boolean;
  onDecrease?: (productId: number, quantity: number) => void;
  onIncrease?: (productId: number, quantity: number) => void;
  onRemove?: (productId: number) => void;
  formatPrice: (price: number) => string;
}

const CartItemRow = memo(function CartItemRow({
  item,
  compact = false,
  onDecrease,
  onIncrease,
  onRemove,
  formatPrice,
}: CartItemRowProps) {
  const handleDecrease = useCallback(() => {
    onDecrease?.(item.productId, item.quantity);
  }, [item.productId, item.quantity, onDecrease]);

  const handleIncrease = useCallback(() => {
    onIncrease?.(item.productId, item.quantity);
  }, [item.productId, item.quantity, onIncrease]);

  const handleRemove = useCallback(() => {
    onRemove?.(item.productId);
  }, [item.productId, onRemove]);

  return (
    <div
      className={`flex items-center ${
        compact ? "gap-3 p-3" : "gap-4 p-4"
      } border border-gray-200 rounded-lg`}
    >
      <div
        className={`relative ${compact ? "w-16 h-16" : "w-20 h-20"} flex-shrink-0`}
      >
        <Image
          src={item.liveProduct?.imageUrl || item.image || "/placeholder.png"}
          alt={item.liveProduct?.title || item.title}
          fill
          className="object-cover rounded-md"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3
          className={`font-medium text-gray-900 ${compact ? "text-sm" : ""} truncate`}
        >
          {item.liveProduct?.title || item.title}
        </h3>
        <p
          className={`${compact ? "text-sm" : "text-lg"} font-bold text-blue-600 mt-1`}
        >
          {formatPrice(item.liveProduct?.price ?? item.price)}
        </p>
      </div>

      <div className={`flex items-center ${compact ? "gap-1" : "gap-2"}`}>
        <button
          onClick={handleDecrease}
          disabled={item.quantity <= 1 || !onDecrease}
          className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <Minus className={compact ? "w-3 h-3" : "w-4 h-4"} />
        </button>
        <span
          className={`${compact ? "w-8 text-sm" : "w-12"} text-center font-medium`}
        >
          {item.quantity}
        </span>
        <button
          onClick={handleIncrease}
          disabled={!onIncrease}
          className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <Plus className={compact ? "w-3 h-3" : "w-4 h-4"} />
        </button>
      </div>

      <button
        onClick={handleRemove}
        disabled={!onRemove}
        className={`${
          compact ? "p-1" : "p-2"
        } text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full disabled:opacity-50`}
      >
        <Trash2 className={compact ? "w-4 h-4" : "w-5 h-5"} />
      </button>
    </div>
  );
});

export default CartItemRow;
