"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProduct, updateProduct } from "@/actions/product";
import { uploadImageToCloudinary } from "@/lib/cloudinary";



export default function ProductList({
  products,
  categories,
}: {
  products: any[];
  categories: { id: number; name: string }[];
  initialSearch?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/admin/products?q=${search}`);
  };


  const handleEditClick = (product: any) => {
    setEditingId(product.id);
    setEditForm({
      title: product.title,
      description: product.description,
      price: String(product.price),
      imageUrl: product.imageUrl,
      categoryId: String(product.categoryId),
    });
    setPreviewUrl(product.imageUrl || null);
    setImageFile(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const uploadedUrl = imageFile ? await uploadImageToCloudinary(imageFile) : editForm.imageUrl;

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
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex items-center space-x-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products"
          className="border px-2 py-1 w-full max-w-sm"
        />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">Search</button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div key={p.id} className="border rounded p-4 shadow space-y-2">
            {editingId === p.id ? (
              <>
                <input name="title" value={editForm.title} onChange={handleEditChange} className="border px-2 py-1 w-full" />
                <input name="description" value={editForm.description} onChange={handleEditChange} className="border px-2 py-1 w-full" />
                <input name="price" type="number" value={editForm.price} onChange={handleEditChange} className="border px-2 py-1 w-full" />

                <input type="file" accept="image/*" onChange={handleImageChange} className="border px-2 py-1 w-full" />
                {previewUrl && <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded" />}

                <select name="categoryId" value={editForm.categoryId} onChange={handleEditChange} className="border px-2 py-1 w-full">
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(p.id)} className="bg-green-600 text-white px-3 py-1 rounded">Save</button>
                  <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded">Cancel</button>
                </div>
              </>
            ) : (
              <>
                {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="w-full h-40 object-cover rounded" />}
                <div className="font-bold text-lg">{p.title}</div>
                <div>{p.description}</div>
                <div>${p.price}</div>
                <div className="text-sm text-gray-600">Category: {p.category?.name}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleEditClick(p)} className="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="bg-red-600 text-white px-3 py-1 rounded">Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
