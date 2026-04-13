import http from "@/app/lib/http";

export async function fetchSession() {
  return (await http.get("/modules/user/api/auth/session")).data ?? null;
}
