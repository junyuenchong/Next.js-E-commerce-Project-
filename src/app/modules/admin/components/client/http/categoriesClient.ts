import http from "@/app/lib/http";
import { adminApiPaths } from "./paths";

export async function fetchAdminCategories() {
  return (await http.get(adminApiPaths.categories)).data;
}
