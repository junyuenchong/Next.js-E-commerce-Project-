"use client";

import React, { memo } from "react";
import CategoryItem, { Category } from "../types/CategoryItem";

export interface CategoryListProps {
  categories: Category[];
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}

const CategoryList = memo(function CategoryList({
  categories,
  onEdit,
  onDelete,
}: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No categories found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <CategoryItem
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

export default CategoryList;
