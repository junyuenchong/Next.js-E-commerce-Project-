"use client";

import React from "react";

interface ProductSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  search,
  onSearchChange,
  onSearchSubmit,
}) => {
  return (
    <form
      onSubmit={onSearchSubmit}
      className="flex flex-col sm:flex-row items-center gap-2 max-w-lg"
    >
      <div className="w-full">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          name="q"
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products..."
          autoComplete="off"
          className="border px-3 py-2 rounded w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Search
      </button>
    </form>
  );
};

export default ProductSearch; 