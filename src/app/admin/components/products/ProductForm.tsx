"use client";

import { useState } from "react";
import Image from "next/image"; // ✅ import next/image
import { createProduct } from "@/actions/product";

export default function ProductForm({ categories }: { categories: { id: number; name: string }[] }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: String(categories[0]?.id ?? ""),
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let imageUrl = formData.imageUrl;

    if (imageFile) {
      const form = new FormData();
      form.append("file", imageFile);

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });

        const contentType = res.headers.get("content-type");
        if (!res.ok) {
          const message = contentType?.includes("application/json")
            ? (await res.json()).message
            : "Unknown upload error";
          throw new Error(message);
        }

        const data = await res.json();
        imageUrl = data.secure_url;
      } catch (error) {
        console.error("❌ Image upload failed:", error);
        alert("❌ Image upload failed: " + (error as Error).message);
        setLoading(false);
        return;
      }
    }

    const payload = {
      ...formData,
      imageUrl,
      price: parseFloat(formData.price),
      description: formData.description?.trim() || undefined,
    };

    try {
      await createProduct(payload);
      alert("✅ Product created!");

      setFormData({
        title: "",
        description: "",
        price: "",
        imageUrl: "",
        categoryId: String(categories[0]?.id ?? ""),
      });
      setPreviewUrl(null);
      setImageFile(null);
    } catch (error) {
      console.error("❌ Product creation failed:", error);
      alert("❌ Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <input
        name="title"
        value={formData.title}
        onChange={handleChange}
        placeholder="Title"
        required
        className="border px-3 py-2 w-full rounded"
      />
      <input
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Description"
        className="border px-3 py-2 w-full rounded"
      />
      <input
        name="price"
        type="number"
        value={formData.price}
        onChange={handleChange}
        placeholder="Price"
        required
        className="border px-3 py-2 w-full rounded"
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="border px-3 py-2 w-full rounded"
      />

      {previewUrl && (
        <Image
          src={previewUrl}
          alt="Preview"
          width={128}
          height={128}
          className="rounded border object-cover w-32 h-32"
        />
      )}

      <select
        name="categoryId"
        value={formData.categoryId}
        onChange={handleChange}
        className="border px-3 py-2 w-full rounded"
      >
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={loading}
        className={`bg-blue-600 text-white px-4 py-2 rounded w-full transition ${
          loading ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700"
        }`}
      >
        {loading ? "Creating..." : "Create Product"}
      </button>
    </form>
  );
}
