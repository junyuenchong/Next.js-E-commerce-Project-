import http from "@/app/utils/http";

export async function fetchCategories() {
  return (await http.get("/modules/user/api/categories")).data;
}

export async function fetchCategoryBySlug(slug: string) {
  return (await http.get(`/modules/user/api/categories/${slug}`)).data;
}
