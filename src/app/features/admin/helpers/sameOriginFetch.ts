import { parseApiJsonErrorMessage } from "@/app/utils/http";

/**
 * Same-origin `fetch` with cookies for admin routes. Bypasses Axios `NEXT_PUBLIC_API_BASE_URL`
 * so the session cookie always matches the admin app origin (e.g. multipart uploads).
 */
export async function fetchSameOriginJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    throw new Error(
      parseApiJsonErrorMessage(
        data,
        res.status,
        `Request failed (${res.status})`,
      ),
    );
  }
  return data;
}
