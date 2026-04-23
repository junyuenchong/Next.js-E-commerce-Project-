import { http } from "@/app/lib/network";

export async function fetchSession() {
  return (await http.get("/features/user/api/auth/session")).data ?? null;
}
