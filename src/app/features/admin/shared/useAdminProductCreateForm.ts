"use client";

/**
 * admin product create hook
 * manage categories, validation, upload, and submit
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createProduct } from "@/backend/modules/product";
import { getErrorMessage } from "@/app/lib/network";
import { productSchema } from "@/shared/schema";
import { fetchAdminCategories, postImageUpload } from "@/app/lib/api/admin";
import { buildAdminProductPayload } from "@/app/lib/product";
import { trySetFieldErrorsFromAxios400 } from "@/app/lib/network";

type AdminCategory = { id: number; name: string };

// Manages product-create form state, validation, and submission.
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

  // Select the first category by default after categories load.
  useEffect(() => {
    if (categories.length > 0 && !formData.categoryId) {
      setFormData((prev) => ({
        ...prev,
        categoryId: String(categories[0].id),
      }));
    }
  }, [categories, formData.categoryId]);

  // Update a single form field and clear its inline error.
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

  // Store selected image and update preview URL.
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

  // Upload selected image and return the uploaded URL.
  async function uploadImageIfNeeded(): Promise<string> {
    if (!imageFile) return formData.imageUrl;
    const form = new FormData();
    form.append("file", imageFile);
    const data = await postImageUpload(form);
    return data.secure_url;
  }

  // Validate normalized payload with the shared product schema.
  const validateForm = useCallback(() => {
    // Validate normalized values, not raw string inputs.
    const payload = buildAdminProductPayload(formData);

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

  // Submit after validation and optional image upload.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    // Upload first so final payload contains the final URL.
    let imageUrl = formData.imageUrl;
    try {
      imageUrl = await uploadImageIfNeeded();
    } catch (error: unknown) {
      console.error("[ProductForm] image upload failed:", error);
      alert(`Image upload failed: ${getErrorMessage(error)}`);
      setLoading(false);
      return;
    }

    const payload = buildAdminProductPayload(formData, { imageUrl });

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
      if (trySetFieldErrorsFromAxios400(error, setErrors)) return;
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
