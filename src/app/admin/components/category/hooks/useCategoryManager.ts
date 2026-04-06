"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Category } from "../types/CategoryItem";

// Admin category hook: manages category form, search, and CRUD UI interactions.
export interface ActionResponse {
  message?: string;
  results?: Category[];
}

export interface UseCategoryManagerProps {
  categories: Category[];
  onSubmit: (prev: null, formData: FormData) => Promise<ActionResponse>;
  onDelete: (prev: null, formData: FormData) => Promise<ActionResponse>;
  onSearch: (prev: null, formData: FormData) => Promise<ActionResponse>;
  onRefresh?: () => void;
}

export function useCategoryManager({
  categories,
  onSubmit,
  onDelete,
  onSearch,
  onRefresh,
}: UseCategoryManagerProps) {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtered, setFiltered] = useState(categories ?? []);
  const [loading, setLoading] = useState(false);

  // Keep filtered list in sync when search is cleared or source categories change.
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFiltered(categories ?? []);
    }
  }, [categories, searchQuery]);

  // Store a stable reference to onRefresh
  const onRefreshRef = useRef(onRefresh);

  // Enter edit mode and prefill category form.
  const handleEdit = useCallback((id: number, name: string) => {
    setEditId(id);
    setName(name);
  }, []);

  // Execute server-side category search and update filtered list.
  const handleSearch = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const formData = new FormData();
      formData.append("query", searchQuery.trim());

      const res = await onSearch(null, formData);
      if (res?.results) {
        setFiltered(res.results);
      } else {
        alert("No results found.");
      }
    },
    [searchQuery, onSearch],
  );

  // Create/update category, then trigger wrapper refresh callback.
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!name.trim()) {
        alert("Category name cannot be empty.");
        return;
      }

      setLoading(true);

      const formData = new FormData();
      formData.append("name", name.trim());
      if (editId) formData.append("id", String(editId));

      const res = await onSubmit(null, formData);
      setLoading(false);

      if (res?.message === "Success") {
        alert(
          editId
            ? "Category updated successfully!"
            : "Category created successfully!",
        );
        setName("");
        setEditId(null);
        if (onRefreshRef.current) {
          onRefreshRef.current();
        }
      } else {
        alert(res?.message || "Something went wrong.");
      }
    },
    [name, editId, onSubmit],
  );

  // Delete category by id and refresh list on success.
  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("Are you sure you want to delete this category?")) return;

      const formData = new FormData();
      formData.append("id", String(id));
      const res = await onDelete(null, formData);

      if (res?.message === "Deleted") {
        alert("Category deleted successfully.");
        if (onRefreshRef.current) {
          onRefreshRef.current();
        }
      } else {
        alert(res?.message || "Failed to delete.");
      }
    },
    [onDelete],
  );

  // Local input handlers for controlled form/search fields.
  const handleNameChange = useCallback((newName: string) => {
    setName(newName);
  }, []);

  const handleSearchChange = useCallback((newQuery: string) => {
    setSearchQuery(newQuery);
  }, []);

  return {
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
  };
}
