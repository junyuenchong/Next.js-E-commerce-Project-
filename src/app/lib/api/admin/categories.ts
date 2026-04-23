import { http } from "@/app/lib/network";
import { adminApiPaths } from "./paths";

export async function fetchAdminCategories() {
  return (await http.get(adminApiPaths.categories)).data;
}
