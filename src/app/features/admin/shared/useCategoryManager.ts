"use client";

/**
 * category manager hook
 * manage search, edit, delete, and submit actions
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { Category } from "@/app/features/admin/types";

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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFiltered(categories ?? []);
    }
  }, [categories, searchQuery]);

  const onRefreshRef = useRef(onRefresh);

  const handleEdit = useCallback((id: number, name: string) => {
    setEditId(id);
    setName(name);
  }, []);

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

  const handleNameChange = useCallback((newName: string) => {
    setName(newName);
  }, []);

  const handleSearchChange = useCallback((newQuery: string) => {
    setSearchQuery(newQuery);
  }, []);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  return {
    name,
    editId,
    searchQuery,
    filtered,
    loading,
    handleEdit,
    handleSearch,
    handleSubmit,
    handleDelete,
    handleNameChange,
    handleSearchChange,
  };
}
