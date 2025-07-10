// app/admin/categories/page.tsx
import {
  createCategory,
  updateCategory,
  deleteCategory,
  searchCategories,
  getAllCategories,
} from "@/actions/category";

import * as zod from "zod";
import CategoryManager from "../components/category/page";

// Prevent prerendering since this page requires database access
export const dynamic = 'force-dynamic';

// Define Category type
interface Category {
  id: number;
  name: string;
  slug: string;
}

const CategorySchema = zod.object({
  id: zod.string().optional(),
  name: zod.string().min(1),
});

const CategoryPage = async () => {
  let categories: Category[] = [];
  
  try {
    categories = await getAllCategories();
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    // During prerendering, if database is not available, use empty array
    categories = [];
  }

  // Server actions
  const handleAction = async (_: unknown, formData: FormData) => {
    "use server";

    const parsed = CategorySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Invalid form data" };
    }

    const { id, name } = parsed.data;

    try {
      if (id) {
        await updateCategory(Number(id), name);
      } else {
        await createCategory(name);
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

    try {
      await deleteCategory(Number(id));
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

    const results = await searchCategories(query);
    return { results };
  };

  return (
    <CategoryManager
      categories={categories}
      onSubmit={handleAction}
      onDelete={handleDelete}
      onSearch={handleSearch}
    />
  );
};

export default CategoryPage;