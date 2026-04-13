"use client";

import { Product } from "@prisma/client";
import React, { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useAddToCart } from "@/app/modules/user/hooks";

type AddToCartButtonProps = {
  product: Product;
};

const AddToCartButton = ({ product }: AddToCartButtonProps) => {
  const { add, isLoading, errorMessage } = useAddToCart(product.id);
  const maxQty = product.isActive ? Math.max(0, product.stock) : 0;
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty((q) => {
      if (maxQty < 1) return 1;
      return Math.min(Math.max(1, q), maxQty);
    });
  }, [maxQty, product.id]);

  const canBuy = maxQty > 0;

  return (
    <div className="flex flex-col gap-3">
      {canBuy ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">
            Quantity (max {maxQty} in stock)
          </span>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 bg-white">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={isLoading || qty <= 1}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-10 text-center font-medium tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={isLoading || qty >= maxQty}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {product.isActive ? "Out of stock" : "This product is unavailable."}
        </p>
      )}
      <button
        onClick={() => add(qty)}
        disabled={isLoading || !canBuy}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center min-w-[160px]"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Adding...
          </div>
        ) : (
          "Add to Cart"
        )}
      </button>
      {errorMessage ? (
        <div className="text-red-600 text-sm">{errorMessage}</div>
      ) : null}
    </div>
  );
};

export default AddToCartButton;
