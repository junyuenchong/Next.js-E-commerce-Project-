// app/admin/categories/page.tsx
import {
    createCategory,
    updateCategory,
    deleteCategory,
    searchCategories,
    getAllCategories,
  } from "@/actions/category";
  import CategoryManager from "@/components/admin/category/page";
  
  import * as zod from "zod"; // ✅ Replace `z` with `zod`
  
  const CategorySchema = zod.object({
    id: zod.string().optional(),
    name: zod.string().min(1),
  });
  
  const CategoryPage = async () => {
    const categories = await getAllCategories();
  
    // Server actions
    const handleAction = async (_prevState: any, formData: FormData) => {
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
      } catch (err: any) {
        return { message: err.message || "Failed to save category" };
      }
  
      return { message: "Success" };
    };
  
    const handleDelete = async (_prevState: any, formData: FormData) => {
      "use server";
      const id = formData.get("id");
      if (!id) return { message: "ID required" };
  
      try {
        await deleteCategory(Number(id));
      } catch (err: any) {
        return { message: err.message || "Failed to delete" };
      }
  
      return { message: "Deleted" };
    };
  
    const handleSearch = async (_prevState: any, formData: FormData) => {
      "use server";
      const query = formData.get("query") as string;
      if (!query) return { message: "No search query" };
  
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
  