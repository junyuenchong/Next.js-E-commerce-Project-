"use client";

import React, { useState } from "react";
import { categorySchema } from "@/lib/validators/category";

export interface CategoryFormProps {
  name: string;
  editId: number | null;
  loading: boolean;
  onNameChange: (name: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  name,
  editId,
  loading,
  onNameChange,
  onSubmit,
}) => {
  const [error, setError] = useState<string>("");

  const handleNameChange = (value: string) => {
    onNameChange(value);
    
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Client-side validation
    const validation = categorySchema.safeParse({ name });
    
    if (!validation.success) {
      setError(validation.error.errors[0]?.message || "Invalid category name");
      return;
    }
    
    setError("");
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div>
        <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 mb-1">
          Category Name
        </label>
        <input
          id="category-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Enter category name"
          autoComplete="off"
          required
          className={`border px-3 py-2 w-full rounded ${error ? 'border-red-500' : ''}`}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
      
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Creating..." : editId ? "Update Category" : "Create Category"}
        </button>
        
        {editId && (
          <button
            type="button"
            onClick={() => onNameChange("")}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default CategoryForm; 