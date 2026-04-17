/**
 * Admin forms: turn backend 400 `detail` strings (`field: msg; …`) into per-field error maps.
 */

import { isAxiosError } from "@/app/utils/http";

function parseFieldErrorsFromDetail(detail: string): Record<string, string> {
  // Note: backend format is `field: message; field2: message2`.
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
 * Try to surface backend validation details as per-field UI errors.
 * Returns true when field errors were applied.
 */
export function trySetFieldErrorsFromAxios400(
  error: unknown,
  setErrors: (fields: Record<string, string>) => void,
): boolean {
  if (
    !isAxiosError<{ error?: string; message?: string; detail?: string }>(error)
  ) {
    return false;
  }
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
