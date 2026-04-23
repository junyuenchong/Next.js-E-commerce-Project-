import { isAxiosError } from "@/app/lib/network";

/**
 * field error helpers
 * map backend detail text to field error map
 */
function parseFieldErrorsFromDetail(detail: string): Record<string, string> {
  const out: Record<string, string> = {};
  const text = detail.trim();
  if (!text) return out;
  for (const part of text.split(";")) {
    const seg = part.trim();
    if (!seg) continue;
    const idx = seg.indexOf(":");
    if (idx < 0) continue;
    const key = seg.slice(0, idx).trim();
    const msg = seg.slice(idx + 1).trim();
    if (!key || !msg) continue;
    out[key] = msg;
  }
  return out;
}

/**
 * field error applier
 * apply parsed backend validation errors to fields
 */
export function trySetFieldErrorsFromAxios400(
  error: unknown,
  setErrors: (fields: Record<string, string>) => void,
): boolean {
  if (
    !isAxiosError<{ error?: string; message?: string; detail?: string }>(error)
  )
    return false;

  const status = error.response?.status ?? 0;
  const detail =
    typeof error.response?.data?.detail === "string"
      ? error.response.data.detail
      : "";
  if (status !== 400 || !detail) return false;

  const fields = parseFieldErrorsFromDetail(detail);
  if (Object.keys(fields).length === 0) return false;
  setErrors(fields);
  return true;
}
