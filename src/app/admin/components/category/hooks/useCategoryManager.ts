"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Category } from "../types/CategoryItem";
import { getSocket } from "@/lib/socket/socket";

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
  const [isConnected, setIsConnected] = useState(false);

  // Store a stable reference to onRefresh
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      console.error("❌ Failed to get socket instance for admin categories");
      return;
    }

    socket.connect();

    socket.on("categories_updated", () => {
      console.log("🔄 [DEBUG] Received categories_updated event via WebSocket");
      if (onRefreshRef.current) {
        console.log("🔄 [DEBUG] Calling onRefresh from categories_updated event");
        onRefreshRef.current();
      } else {
        console.log("⚠️ [DEBUG] onRefreshRef.current is undefined");
      }
    });

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket for admin categories");
      setIsConnected(true);
      console.log("[DEBUG] Emitting join 'categories' event");
      socket.emit("join", "categories");
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket for admin categories");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection error:", error);
      setIsConnected(false);
    });

    socket.on("joined", (room) => {
      console.log("✅ [DEBUG] Joined room:", room);
    });

    return () => {
      socket.off("categories_updated");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("joined");
      socket.disconnect();
    };
  }, []);

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
    [searchQuery, onSearch]
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
        alert(editId ? "Category updated successfully!" : "Category created successfully!");
        setName("");
        setEditId(null);
        if (onRefreshRef.current) {
          onRefreshRef.current();
        }
      } else {
        alert(res?.message || "Something went wrong.");
      }
    },
    [name, editId, onSubmit]
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
    [onDelete]
  );

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
    isConnected,

    // Handlers
    handleEdit,
    handleSearch,
    handleSubmit,
    handleDelete,
    handleNameChange,
    handleSearchChange,
  };
}
