// app/admin/categories/page.tsx
import {
  createCategory,
  updateCategory,
  deleteCategory,
  searchCategories,
} from "@/actions/category";

import { categorySchema } from "@/lib/validators/category";
import CategoryManagerWrapper from "../components/category/sub/CategoryManagerWrapper";

const CategoryPage = async () => {
  // Server actions
  const handleAction = async (_: unknown, formData: FormData) => {
    "use server";

    const name = formData.get("name") as string;
    const id = formData.get("id") as string;

    // Validate category name
    const validation = categorySchema.safeParse({ name });
    if (!validation.success) {
      return { 
        message: "Invalid category name", 
        errors: validation.error.errors.map(e => e.message) 
      };
    }

    const { name: validatedName } = validation.data;

    try {
      if (id) {
        await updateCategory(Number(id), validatedName);
      } else {
        await createCategory(validatedName);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { message: err.message };
      }
      return { message: "Failed to save category" };
    }

    return { message: "Success" };
  };

  const handleDelete = async (_: unknown, formData: FormData) => {
    "use server";
    const id = formData.get("id");
    if (!id) return { message: "ID required" };

    // Validate ID is a number
    const idNumber = Number(id);
    if (isNaN(idNumber) || idNumber <= 0) {
      return { message: "Invalid category ID" };
    }

    try {
      await deleteCategory(idNumber);
    } catch (err: unknown) {
      if (err instanceof Error) {
        return { message: err.message };
      }
      return { message: "Failed to delete" };
    }

    return { message: "Deleted" };
  };

  const handleSearch = async (_: unknown, formData: FormData) => {
    "use server";
    const query = formData.get("query") as string;

    // Validate search query
    if (!query || query.trim().length === 0) {
      return { results: [] };
    }

    const validation = categorySchema.safeParse({ name: query.trim() });
    if (!validation.success) {
      return { 
        message: "Invalid search query", 
        results: [] 
      };
    }

    const results = await searchCategories(validation.data.name);
    return { results };
  };

  return (
    <CategoryManagerWrapper
      onSubmit={handleAction}
      onDelete={handleDelete}
      onSearch={handleSearch}
    />
  );
};

export default CategoryPage;