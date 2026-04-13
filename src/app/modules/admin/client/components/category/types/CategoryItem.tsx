"use client";

import React, { memo, useCallback } from "react";

// Types
export interface Category {
  id: number;
  name: string;
  slug: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryItemProps {
  category: Category;
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}

const CategoryItem = memo(function CategoryItem({
  category,
  onEdit,
  onDelete,
}: CategoryItemProps) {
  const handleEditClick = useCallback(() => {
    onEdit(category.id, category.name);
  }, [category.id, category.name, onEdit]);

  const handleDeleteClick = useCallback(() => {
    onDelete(category.id);
  }, [category.id, onDelete]);

  return (
    <div className="flex justify-between items-center border p-3 rounded shadow-sm bg-white hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-medium text-gray-800">{category.name}</span>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEditClick}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          className="text-red-600 hover:text-red-800 font-medium text-sm px-3 py-1 rounded hover:bg-red-50 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
});

export default CategoryItem;
