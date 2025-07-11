"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { deleteProduct, updateProduct } from "@/actions/product";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Product, Category } from "@prisma/client";

interface ProductWithCategory extends Product {
  category?: Category;
}

interface ProductListProps {
  products: ProductWithCategory[];
  categories: Category[];
  initialSearch?: string;
}

export default function ProductList({
  products,
  categories,
  initialSearch = "",
}: ProductListProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/products?q=${encodeURIComponent(search)}`);
  };

  const handleEditClick = (product: ProductWithCategory) => {
    setEditingId(product.id);
    setEditForm({
      title: product.title || "",
      description: product.description || "",
      price: String(product.price || ""),
      imageUrl: product.imageUrl || "",
      categoryId: String(product.categoryId || ""),
    });
    setPreviewUrl(product.imageUrl || null);
    setImageFile(null);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const uploadedUrl = imageFile
        ? await uploadImageToCloudinary(imageFile)
        : editForm.imageUrl;

      await updateProduct(id, {
        ...editForm,
        imageUrl: uploadedUrl,
        price: parseFloat(editForm.price),
        categoryId: parseInt(editForm.categoryId),
      });

      alert("✅ Product updated!");
      setEditingId(null);
      router.refresh();
    } catch (error) {
      alert("❌ Update failed");
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this product?")) {
      await deleteProduct(id);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 px-4">
      {/* 🔍 Search */}
      <form
        onSubmit={handleSearch}
        className="flex flex-col sm:flex-row items-center gap-2 max-w-lg"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products"
          className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded w-full sm:w-auto"
        >
          Search
        </button>
      </form>

      {/* 🧱 Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div
            key={p.id}
            className="border rounded-lg p-4 shadow-md bg-white flex flex-col"
          >
            {editingId === p.id ? (
              <div className="space-y-3">
                <input
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  className="border px-3 py-2 rounded w-full text-sm"
                />
                <input
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  className="border px-3 py-2 rounded w-full text-sm"
                />
                <input
                  name="price"
                  type="number"
                  value={editForm.price}
                  onChange={handleEditChange}
                  className="border px-3 py-2 rounded w-full text-sm"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="border px-3 py-2 rounded w-full text-sm"
                />
                {previewUrl && (
                  <div className="w-full aspect-[4/3] relative">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="rounded object-cover"
                    />
                  </div>
                )}
                <select
                  name="categoryId"
                  value={editForm.categoryId}
                  onChange={handleEditChange}
                  className="border px-3 py-2 rounded w-full text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleUpdate(p.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded text-sm w-full sm:w-auto"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="bg-gray-400 text-white px-4 py-2 rounded text-sm w-full sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {p.imageUrl && (
                  <div className="w-full aspect-[4/3] relative">
                    <Image
                      src={p.imageUrl}
                      alt={p.title}
                      fill
                      className="rounded object-cover"
                    />
                  </div>
                )}
                <div className="font-semibold text-lg mt-3">{p.title}</div>
                <div className="text-sm text-gray-700">{p.description}</div>
                <div className="font-medium text-gray-800 mt-1">
                  ${p.price}
                </div>
                <div className="text-sm text-gray-500">
                  Category: {p.category?.name || "Uncategorized"}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <button
                    onClick={() => handleEditClick(p)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded text-sm w-full sm:w-auto"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded text-sm w-full sm:w-auto"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
