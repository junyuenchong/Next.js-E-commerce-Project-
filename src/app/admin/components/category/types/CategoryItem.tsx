"use client";

import React from "react";

// Types
export interface Category {
  id: number;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryItemProps {
  category: Category;
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="flex justify-between items-center border p-3 rounded bg-white shadow-sm hover:shadow-md transition-shadow">
      <span className="font-medium text-gray-800">{category.name}</span>
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(category.id, category.name)}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded hover:bg-blue-50 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(category.id)}
          className="text-red-600 hover:text-red-800 font-medium text-sm px-3 py-1 rounded hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default CategoryItem; 