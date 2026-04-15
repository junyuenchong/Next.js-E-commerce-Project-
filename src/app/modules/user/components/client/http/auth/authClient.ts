import http from "@/app/lib/http";

export async function postLogout() {
  await http.post("/modules/user/api/auth/logout");
}
