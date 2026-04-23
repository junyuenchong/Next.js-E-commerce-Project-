import { parseApiJsonErrorMessage } from "@/app/lib/network";

/**
 * same-origin fetch helper
 * fetch json with cookies for same-origin routes
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
