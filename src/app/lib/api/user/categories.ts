import { http } from "@/app/lib/network";

export async function fetchCategories() {
  return (await http.get("/features/user/api/categories")).data;
}

export async function fetchCategoryBySlug(slug: string) {
  return (await http.get(`/features/user/api/categories/${slug}`)).data;
}
