"use client";

import React, { memo } from "react";
import {
  useCategoryManager,
  ActionResponse,
} from "../hooks/useCategoryManager";
import CategoryForm from "../sub/CategoryForm";
import CategorySearch from "../sub/CategorySearch";
import CategoryList from "../sub/CategoryList";
import { Category } from "../types/CategoryItem";

export interface CategoryManagerProps {
  categories: Category[];
  onSubmit: (prev: null, formData: FormData) => Promise<ActionResponse>;
  onDelete: (prev: null, formData: FormData) => Promise<ActionResponse>;
  onSearch: (prev: null, formData: FormData) => Promise<ActionResponse>;
  onRefresh?: () => void;
}

type CategoryManagerComponentProps = Omit<
  CategoryManagerProps,
  "categories"
> & {
  categories: Category[];
};

const CategoryManager = memo(function CategoryManager({
  categories,
  onSubmit,
  onDelete,
  onSearch,
  onRefresh,
}: CategoryManagerComponentProps) {
  const {
    // State
    name,
    editId,
    searchQuery,
    filtered,
    loading,

    // Handlers
    handleEdit,
    handleSearch,
    handleSubmit,
    handleDelete,
    handleNameChange,
    handleSearchChange,
  } = useCategoryManager({
    categories,
    onSubmit,
    onDelete,
    onSearch,
    onRefresh,
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Category Management
          </h1>
          <p className="text-gray-600">
            Create, edit, and manage your product categories
          </p>
        </div>

        {/* Category Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add New Category
          </h2>
          <CategoryForm
            name={name}
            editId={editId}
            loading={loading}
            onNameChange={handleNameChange}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Category List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Category List
          </h2>

          <CategorySearch
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearch}
          />

          <CategoryList
            categories={filtered}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </main>
  );
});

export default CategoryManager;
