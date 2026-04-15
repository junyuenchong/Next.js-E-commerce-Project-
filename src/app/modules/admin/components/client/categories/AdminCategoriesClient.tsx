"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import { adminApiPaths } from "@/app/modules/admin/components/client/http";
import CategoryItem from "@/app/modules/admin/components/client/category/types/CategoryItem";
import type { Category } from "@/app/modules/admin/components/client/category/types/CategoryItem";

type CategoryRow = Omit<Category, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

function toCategory(row: CategoryRow): Category {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

async function fetchCategories(): Promise<CategoryRow[]> {
  const { data } = await http.get<CategoryRow[]>(adminApiPaths.categories);
  return Array.isArray(data) ? data : [];
}

export default function AdminCategoriesClient() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [banner, setBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: fetchCategories,
    staleTime: 30_000,
  });

  const rows = listQuery.data ?? [];

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["admin-categories-list"] });
    void qc.invalidateQueries({ queryKey: ["admin-categories"] });
  }, [qc]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        setBanner({ kind: "err", text: "Name is required." });
        return;
      }
      setBanner(null);
      try {
        if (editId != null) {
          await http.patch(adminApiPaths.categories, {
            id: editId,
            name: name.trim(),
          });
          setBanner({ kind: "ok", text: "Category updated." });
        } else {
          await http.post(adminApiPaths.categories, { name: name.trim() });
          setBanner({ kind: "ok", text: "Category created." });
        }
        setName("");
        setEditId(null);
        invalidate();
      } catch (err) {
        setBanner({
          kind: "err",
          text: getErrorMessage(err, "Request failed"),
        });
      }
    },
    [editId, name, invalidate],
  );

  const onEdit = useCallback((id: number, currentName: string) => {
    setEditId(id);
    setName(currentName);
    setBanner(null);
  }, []);

  const onDelete = useCallback(
    async (id: number) => {
      if (
        !window.confirm(
          "Deactivate this category? It will disappear from the storefront.",
        )
      )
        return;
      setBanner(null);
      try {
        await http.delete(
          `${adminApiPaths.categories}?id=${encodeURIComponent(String(id))}`,
        );
        setBanner({ kind: "ok", text: "Category deactivated." });
        if (editId === id) {
          setEditId(null);
          setName("");
        }
        invalidate();
      } catch (err) {
        setBanner({ kind: "err", text: getErrorMessage(err, "Delete failed") });
      }
    },
    [editId, invalidate],
  );

  const cancelEdit = useCallback(() => {
    setEditId(null);
    setName("");
    setBanner(null);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
        <p className="mt-1 text-sm text-gray-600">
          Active categories only in this list. Removing deactivates (soft
          delete).
        </p>
      </div>

      {banner && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            banner.kind === "ok"
              ? "border border-green-200 bg-green-50 text-green-900"
              : "border border-red-200 bg-red-50 text-red-900 whitespace-pre-wrap"
          }`}
        >
          {banner.text}
        </div>
      )}

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="cat-name"
            className="block text-xs font-medium text-gray-600"
          >
            {editId != null
              ? `Rename category #${editId}`
              : "New category name"}
          </label>
          <input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. Accessories"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {editId != null ? "Save" : "Add"}
          </button>
          {editId != null && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {listQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading categories…</p>
      ) : listQuery.isError ? (
        <p className="text-sm text-red-600">
          {getErrorMessage(listQuery.error, "Could not load categories.")}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
          No active categories. Create one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <CategoryItem
                category={toCategory(row)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
