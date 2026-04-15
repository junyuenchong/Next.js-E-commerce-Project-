"use client";

import { useCallback, useMemo, useState } from "react";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/backend/modules/product";
import { getErrorMessage } from "@/app/utils/http";
import { productSchema } from "@/shared/schema/admin";
import {
  fetchAdminCategories,
  postImageUpload,
} from "@/app/modules/admin/components/client";

type AdminCategory = { id: number; name: string };

export function useAdminProductCreateForm(onProductCreated?: () => void) {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery<AdminCategory[]>({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
    staleTime: 60000,
  });
  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );
  const categoriesLoading = categoriesQuery.isLoading;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    compareAtPrice: "",
    stock: "0",
    imageUrl: "",
    categoryId: "",
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (categories.length > 0 && !formData.categoryId) {
      setFormData((prev) => ({
        ...prev,
        categoryId: String(categories[0].id),
      }));
    }
  }, [categories, formData.categoryId]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));

      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors],
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setImageFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    },
    [],
  );

  const validateForm = useCallback(() => {
    const stockNum = parseInt(formData.stock, 10);
    const cap = formData.compareAtPrice.trim();
    const payload = {
      title: formData.title,
      description: formData.description,
      price: parseFloat(formData.price) || 0,
      ...(cap === "" ? {} : { compareAtPrice: parseFloat(cap) }),
      stock: Number.isFinite(stockNum) ? stockNum : 0,
      imageUrl: formData.imageUrl,
      categoryId: parseInt(formData.categoryId) || 0,
    };

    const validation = productSchema.safeParse(payload);

    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        newErrors[field] = error.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    let imageUrl = formData.imageUrl;

    if (imageFile) {
      const form = new FormData();
      form.append("file", imageFile);

      try {
        const data = await postImageUpload(form);
        imageUrl = data.secure_url;
      } catch (error: unknown) {
        console.error("[ProductForm] image upload failed:", error);
        alert(`Image upload failed: ${getErrorMessage(error)}`);
        setLoading(false);
        return;
      }
    }

    const stockNum = parseInt(formData.stock, 10);
    const cap = formData.compareAtPrice.trim();
    const payload = {
      ...formData,
      imageUrl,
      price: parseFloat(formData.price),
      compareAtPrice: cap === "" ? null : parseFloat(cap),
      stock: Number.isFinite(stockNum) ? stockNum : 0,
      description: formData.description?.trim() || undefined,
    };

    try {
      await createProduct(payload);
      alert("Product created.");

      queryClient.invalidateQueries({ queryKey: ["admin-products"] });

      onProductCreated?.();

      setFormData({
        title: "",
        description: "",
        price: "",
        compareAtPrice: "",
        stock: "0",
        imageUrl: "",
        categoryId: categories.length > 0 ? String(categories[0].id) : "",
      });
      setPreviewUrl(null);
      setImageFile(null);
      setErrors({});
    } catch (error: unknown) {
      console.error("[ProductForm] create product failed:", error);
      alert(`Failed to create product: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    previewUrl,
    loading,
    errors,
    categories,
    categoriesLoading,
    handleChange,
    handleImageChange,
    handleSubmit,
  };
}
