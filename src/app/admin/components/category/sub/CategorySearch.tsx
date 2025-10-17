"use client";

import React from "react";

export interface CategorySearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

const CategorySearch: React.FC<CategorySearchProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}) => {
  return (
    <form onSubmit={onSearchSubmit} className="mb-6 flex gap-2">
      <div className="flex-1">
        <label htmlFor="category-search" className="sr-only">
          Search categories
        </label>
        <input
          id="category-search"
          name="query"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search categories..."
          autoComplete="off"
          className="border px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition font-medium"
      >
        Search
      </button>
    </form>
  );
};

export default CategorySearch; 