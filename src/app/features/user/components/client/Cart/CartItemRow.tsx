"use client";

import React, { memo, useCallback } from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { IMG } from "@/app/lib/product";
import type { CartItemRowData } from "@/app/features/user/types";
import { moneyToNumber } from "@/backend/core/money";

export type { CartItemRowData };

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

  const live = item.liveProduct;
  const maxQty =
    live?.stock != null && live.stock >= 0 ? live.stock : undefined;
  const inactive = live?.isActive === false;
  const atStockCap =
    maxQty !== undefined && (item.quantity >= maxQty || inactive);
  const overStock = maxQty !== undefined && item.quantity > maxQty && !inactive;

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
          sizes={IMG.cart}
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
          {formatPrice(moneyToNumber(item.liveProduct?.price ?? item.price))}
        </p>
        {inactive ? (
          <p className="text-amber-700 text-xs mt-1">No longer available</p>
        ) : maxQty !== undefined ? (
          <p className="text-gray-500 text-xs mt-1">
            {maxQty} in stock
            {overStock
              ? " — lower the quantity or remove this item to match stock"
              : ""}
          </p>
        ) : null}
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
          disabled={!onIncrease || atStockCap}
          title={
            atStockCap && maxQty !== undefined
              ? `Maximum ${maxQty} available`
              : undefined
          }
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
