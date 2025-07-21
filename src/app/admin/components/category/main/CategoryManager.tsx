"use client";

import React from "react";
import { useCategoryManager, ActionResponse } from "../hooks/useCategoryManager";
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

const CategoryManager: React.FC<Omit<CategoryManagerProps, 'categories'> & { categories: Category[] }> = ({
  categories,
  onSubmit,
  onDelete,
  onSearch,
  onRefresh,
}) => {
  const {
    // State
    name,
    editId,
    searchQuery,
    filtered,
    loading,
    isConnected,
    
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Category Management</h1>
          <p className="text-gray-600">Create, edit, and manage your product categories</p>
        </div>

        {/* Category Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Category</h2>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Category List</h2>
          
          {/* Connection Status */}
          {!isConnected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Real-time updates disabled. Changes will appear on page refresh.
                  </p>
                </div>
              </div>
            </div>
          )}

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
};

export default CategoryManager; 