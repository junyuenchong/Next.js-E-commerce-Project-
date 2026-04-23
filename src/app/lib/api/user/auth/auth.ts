import { http } from "@/app/lib/network";

export async function postLogout() {
  await http.post("/features/user/api/auth/logout");
}
