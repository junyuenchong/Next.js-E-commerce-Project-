"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import http, { getErrorMessage } from "@/app/utils/http";
import {
  adminApiPaths,
  fetchAdminCategories,
  postImageUpload,
} from "@/app/modules/admin/components/client/http";
import { useAdminToast } from "@/app/providers/AdminProviders";

type AdminCategory = { id: number; name: string };

export default function ProductCreate() {
  const router = useRouter();
  const { showToast } = useAdminToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    compareAtPrice: "",
    stock: "0",
    imageUrl: "",
    categoryId: "",
  });

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });

  const onChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { name, value } = e.target;
      setForm((f) => ({ ...f, [name]: value }));
    },
    [],
  );

  const onImageFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const looksLikeImage =
        file.type.startsWith("image/") ||
        /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif|svg)$/i.test(file.name);
      if (!looksLikeImage) {
        showToast("Choose an image file.", "error");
        return;
      }
      setUploadingImage(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { secure_url } = await postImageUpload(fd);
        setForm((f) => ({ ...f, imageUrl: secure_url }));
        showToast("Image uploaded to Cloudinary.");
      } catch (err) {
        showToast(getErrorMessage(err, "Upload failed"), "error");
      } finally {
        setUploadingImage(false);
      }
    },
    [showToast],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const stockNum = Number.parseInt(form.stock, 10);
      const cap = form.compareAtPrice.trim();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: Number.parseFloat(form.price),
        compareAtPrice: cap === "" ? null : Number.parseFloat(cap),
        stock: Number.isFinite(stockNum) ? stockNum : 0,
        categoryId: Number.parseInt(form.categoryId, 10),
        imageUrl: form.imageUrl.trim() || undefined,
      };
      if (
        !payload.title ||
        !Number.isFinite(payload.price) ||
        payload.price <= 0
      ) {
        showToast("Title and a positive price are required.", "error");
        return;
      }
      if (!Number.isFinite(payload.categoryId) || payload.categoryId < 1) {
        showToast("Pick a category.", "error");
        return;
      }
      setSubmitting(true);
      try {
        await http.post(adminApiPaths.products, payload);
        showToast("Product created.");
        router.push("/modules/admin/products");
        router.refresh();
      } catch (err) {
        showToast(getErrorMessage(err, "Create failed"), "error");
      } finally {
        setSubmitting(false);
      }
    },
    [form, router, showToast],
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/modules/admin/products"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          New product
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Creates an active catalog item. You can upload an image here or from
          the product card editor on the list.
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-xl border bg-white p-6 shadow-sm"
      >
        <div>
          <label className="text-xs font-medium text-gray-600">Title</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Price</label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              value={form.price}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">
              Compare-at (optional)
            </label>
            <input
              name="compareAtPrice"
              type="number"
              step="0.01"
              min="0"
              value={form.compareAtPrice}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Stock</label>
            <input
              name="stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">
              Category
            </label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={onChange}
              required
              disabled={catLoading}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {(categories as AdminCategory[]).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-600">
            Product image (optional)
          </span>
          <p className="mt-0.5 text-xs text-gray-500">
            Choose a file from your computer or phone — it is uploaded to
            Cloudinary and the URL is saved. You can also paste a URL.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(ev) => void onImageFile(ev)}
              />
              <button
                type="button"
                disabled={uploadingImage || submitting}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                {uploadingImage ? "Uploading…" : "Choose image"}
              </button>
              {form.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                  className="text-sm text-gray-600 underline hover:text-gray-900"
                >
                  Clear
                </button>
              ) : null}
            </div>
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview of user/Cloudinary URL
              <img
                src={form.imageUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-md border border-gray-200 object-cover"
              />
            ) : null}
          </div>
          <label
            htmlFor="product-new-image-url"
            className="mt-3 block text-xs font-medium text-gray-600"
          >
            Image URL (optional)
          </label>
          <input
            id="product-new-image-url"
            name="imageUrl"
            type="url"
            value={form.imageUrl}
            onChange={onChange}
            placeholder="https://…"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create product"}
        </button>
      </form>
    </div>
  );
}
