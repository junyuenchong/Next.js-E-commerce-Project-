import http from "@/app/utils/http";

export async function postLogout() {
  await http.post("/features/user/api/auth/logout");
}
