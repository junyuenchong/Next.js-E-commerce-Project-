import http from "@/app/utils/http";

export async function postLogout() {
  await http.post("/modules/user/api/auth/logout");
}
