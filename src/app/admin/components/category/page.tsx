"use client";

import React, { useState } from "react";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type ActionResponse = {
  message?: string;
  results?: Category[];
};

type Props = {
  categories: Category[];
  onSubmit: (prev: null, formData: FormData) => Promise<ActionResponse>;
  onDelete: (prev: null, formData: FormData) => Promise<ActionResponse>;
  onSearch: (prev: null, formData: FormData) => Promise<ActionResponse>;
};

const CategoryManager = ({ categories, onSubmit, onDelete, onSearch }: Props) => {
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtered, setFiltered] = useState(categories || []);
  const [loading, setLoading] = useState(false);

  const handleEdit = (id: number, name: string) => {
    setEditId(id);
    setName(name);
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append("query", searchQuery.trim());

    const res = await onSearch(null, formData);
    if (res?.results) {
      setFiltered(res.results);
    } else {
      alert("No results found.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      alert(editId ? "Category updated successfully!" : "Category created successfully!");
      location.reload();
    } else {
      alert(res?.message || "Something went wrong.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    const formData = new FormData();
    formData.append("id", String(id));
    const res = await onDelete(null, formData);

    if (res?.message === "Deleted") {
      alert("Category deleted successfully.");
      location.reload();
    } else {
      alert(res?.message || "Failed to delete.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manage Categories</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-2">
        <input
          className="border rounded p-2 flex-1"
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {loading ? "Saving..." : editId ? "Update" : "Create"}
        </button>
      </form>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          className="border p-2 flex-1"
          placeholder="Search category"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="bg-gray-500 text-white px-4 py-2 rounded">Search</button>
      </form>

      {/* List */}
      <ul className="space-y-2">
        {filtered?.map((cat) => (
          <li
            key={cat.id}
            className="flex justify-between items-center border p-2 rounded"
          >
            <span>{cat.name}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(cat.id, cat.name)}
                className="text-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryManager;
