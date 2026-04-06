"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const categoriesToDelete = [
  "booksa",
  "clothing11",
  "electronics",
  "home-garden",
  "sports",
  "a",
  "aa",
  "aaa",
  "abc",
];

export default function DeleteBatchCategoriesPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    Array<{
      slug: string;
      status: "deleted" | "not_found" | "error";
      message: string;
    }>
  >([]);
  const router = useRouter();

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${categoriesToDelete.length} categories? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch("/admin/api/categories/delete-batch", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        alert(
          `Deletion completed!\nDeleted: ${data.summary.deleted}\nNot found: ${data.summary.notFound}\nErrors: ${data.summary.errors}`,
        );
        router.refresh();
        router.push("/admin/categories");
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      alert(
        "Error: " + (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Delete Batch Categories
        </h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Categories to Delete ({categoriesToDelete.length})
          </h2>
          <ul className="list-disc list-inside space-y-2 mb-6">
            {categoriesToDelete.map((slug) => (
              <li key={slug} className="text-gray-700">
                <code className="bg-gray-100 px-2 py-1 rounded">{slug}</code>
              </li>
            ))}
          </ul>

          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Deleting..." : "Delete All Categories"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Results
            </h2>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded ${
                    result.status === "deleted"
                      ? "bg-green-50 text-green-800"
                      : result.status === "not_found"
                        ? "bg-yellow-50 text-yellow-800"
                        : "bg-red-50 text-red-800"
                  }`}
                >
                  <strong>{result.slug}:</strong> {result.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
