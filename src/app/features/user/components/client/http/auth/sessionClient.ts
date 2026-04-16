import http from "@/app/utils/http";

export async function fetchSession() {
  return (await http.get("/features/user/api/auth/session")).data ?? null;
}
