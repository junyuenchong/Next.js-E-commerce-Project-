type JsonErrorBody = { message?: string; error?: string; hint?: string };

/** Parse `{ message, error, hint }` from API JSON bodies. */
export function parseApiJsonErrorMessage(
  data: unknown,
  status: number,
  fallback: string,
): string {
  if (!data || typeof data !== "object") return fallback;
  const o = data as JsonErrorBody;
  const msg =
    (typeof o.message === "string" && o.message.trim() !== ""
      ? o.message
      : undefined) ||
    (typeof o.error === "string" && o.error.trim() !== ""
      ? o.error
      : undefined);
  const hint =
    typeof o.hint === "string" && o.hint.trim() !== "" ? o.hint.trim() : "";
  const base = msg || fallback || `Request failed (${status})`;
  if (hint) return msg ? `${base}\n\n${hint}` : hint;
  return base;
}

export type HttpErrorResponse<T = unknown> = {
  status: number;
  data: T;
};

export class HttpError<T = unknown> extends Error {
  response?: HttpErrorResponse<T>;
  constructor(message: string, response?: HttpErrorResponse<T>) {
    super(message);
    this.name = "HttpError";
    this.response = response;
  }
}

export function isAxiosError<T = unknown>(err: unknown): err is HttpError<T> {
  return err instanceof HttpError;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error",
): string {
  if (
    isAxiosError<{ error?: string; message?: string; hint?: string }>(error)
  ) {
    const data = error.response?.data;
    const status = error.response?.status ?? 0;
    return parseApiJsonErrorMessage(data, status, error.message || fallback);
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

type FetchConfig = Omit<RequestInit, "headers"> & { headers?: HeadersInit };

function resolveUrl(input: string) {
  // Browser: keep relative URLs (cookies match origin). Server: allow base URL.
  const base =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL || ""
      : "";
  if (!base) return input;
  if (/^https?:\/\//i.test(input)) return input;
  return `${base.replace(/\/$/, "")}/${input.replace(/^\//, "")}`;
}

async function parseJsonIfPossible(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await res.json().catch(() => null);
  }
  return await res.text().catch(() => "");
}

// Many callers rely on Axios' historical `any` default; keep that behavior for now.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request<T = any>(
  method: string,
  url: string,
  body?: unknown,
  config?: FetchConfig,
) {
  const headers = new Headers(config?.headers);
  if (body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(resolveUrl(url), {
    method,
    credentials: "include",
    ...config,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });

  const data = (await parseJsonIfPossible(res)) as T;
  if (!res.ok) {
    const msg = parseApiJsonErrorMessage(
      data,
      res.status,
      `Request failed (${res.status})`,
    );
    throw new HttpError(msg, { status: res.status, data });
  }

  return { data };
}

const http = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: <T = any>(url: string, config?: FetchConfig) =>
    request<T>("GET", url, undefined, config),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: <T = any>(url: string, config?: FetchConfig) =>
    request<T>("DELETE", url, undefined, config),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T = any>(url: string, body?: unknown, config?: FetchConfig) =>
    request<T>("POST", url, body, config),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: <T = any>(url: string, body?: unknown, config?: FetchConfig) =>
    request<T>("PUT", url, body, config),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: <T = any>(url: string, body?: unknown, config?: FetchConfig) =>
    request<T>("PATCH", url, body, config),
};

export default http;
