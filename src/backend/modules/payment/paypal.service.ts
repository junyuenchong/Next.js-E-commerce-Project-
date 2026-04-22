// PayPal service layer: token, order, capture, and webhook verification operations.

type PayPalTokenResponse = {
  access_token: string;
  expires_in: number;
};

let cachedToken: { value: string; expiresAtMs: number } | null = null;
// retry config for transient gateway/network errors.
const PAYPAL_RETRY_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.PAYPAL_RETRY_LIMIT ?? "3", 10) || 3,
);
const PAYPAL_RETRY_BASE_MS = Math.max(
  50,
  Number.parseInt(process.env.PAYPAL_RETRY_BASE_MS ?? "250", 10) || 250,
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// retry on timeout/rate-limit/conflict/server errors.
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function retryDelayMs(attempt: number): number {
  const jitter = Math.floor(Math.random() * 50);
  return PAYPAL_RETRY_BASE_MS * 2 ** attempt + jitter;
}

// shared retry wrapper for PayPal HTTP calls.
async function retryPayPalRequest(
  operationName: string,
  run: () => Promise<Response>,
): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < PAYPAL_RETRY_LIMIT; attempt += 1) {
    try {
      const res = await run();
      if (
        !isRetryableStatus(res.status) ||
        attempt === PAYPAL_RETRY_LIMIT - 1
      ) {
        return res;
      }
      console.warn(
        `[paypal] ${operationName} retryable status ${res.status}, retry ${attempt + 1}/${PAYPAL_RETRY_LIMIT}`,
      );
    } catch (error) {
      lastError = error;
      if (attempt === PAYPAL_RETRY_LIMIT - 1) {
        break;
      }
      console.warn(
        `[paypal] ${operationName} transient error, retry ${attempt + 1}/${PAYPAL_RETRY_LIMIT}`,
      );
    }
    await sleep(retryDelayMs(attempt));
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`[paypal] ${operationName} failed after retries`);
}

/**
 * Resolve PayPal API base URL, preferring env override.
 */
export function getPayPalApiBase(): string {
  const explicit = process.env.PAYPAL_API_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const legacy = process.env.PAYPAL_API?.trim();
  if (legacy?.includes("api-m.paypal.com")) return legacy.replace(/\/$/, "");
  return "https://api-m.sandbox.paypal.com";
}

// read PayPal credentials from env vars, or null when unavailable.
function getClientCredentials(): { id: string; secret: string } | null {
  const id =
    process.env.PAYPAL_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
  const secret =
    process.env.PAYPAL_SECRET_KEY?.trim() ||
    process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

/**
 * Retrieve and cache PayPal access token.
 */
export async function getPayPalAccessToken(): Promise<string | null> {
  const creds = getClientCredentials();
  if (!creds) return null;

  const now = Date.now();
  // reuse token until near expiry to reduce auth round-trips.
  if (cachedToken && cachedToken.expiresAtMs > now + 30_000) {
    return cachedToken.value;
  }

  const base = getPayPalApiBase();
  let res: Response;
  try {
    res = await retryPayPalRequest("oauth-token", () =>
      fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${creds.id}:${creds.secret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      }),
    );
  } catch (error) {
    console.error("[paypal] token request failed", error);
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("[paypal] token error", res.status, text);
    return null;
  }

  const data = (await res.json()) as PayPalTokenResponse;
  cachedToken = {
    value: data.access_token,
    expiresAtMs: now + (data.expires_in ?? 300) * 1000,
  };
  return data.access_token;
}

/**
 * Create a PayPal order.
 */
export async function paypalCreateOrder(body: {
  currencyCode: string;
  value: string;
  idempotencyKey?: string;
}): Promise<{ id: string } | null> {
  // order creation only sends amount fields; detail persistence happens after capture.
  // pass idempotency key so replay requests reuse the same gateway transaction.
  const token = await getPayPalAccessToken();
  if (!token) return null;

  const base = getPayPalApiBase();
  let res: Response;
  try {
    res = await retryPayPalRequest("create-order", () =>
      fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(body.idempotencyKey
            ? { "PayPal-Request-Id": body.idempotencyKey }
            : {}),
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: body.currencyCode,
                value: body.value,
              },
            },
          ],
        }),
      }),
    );
  } catch (error) {
    console.error("[paypal] create order failed", error);
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("[paypal] create order", res.status, text);
    return null;
  }

  const data = (await res.json()) as { id?: string };
  return data.id ? { id: data.id } : null;
}

/**
 * Fetch order details from PayPal.
 */
export async function paypalGetOrder(orderId: string): Promise<unknown | null> {
  const token = await getPayPalAccessToken();
  if (!token) return null;
  const base = getPayPalApiBase();
  const res = await fetch(
    `${base}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) return null;
  return res.json();
}

/**
 * Extract order amount/currency from PayPal order payload.
 */
export function paypalOrderAmount(
  order: unknown,
): { currencyCode: string; value: string } | null {
  if (!order || typeof order !== "object") return null;
  const firstPurchaseUnit = (order as { purchase_units?: unknown[] })
    .purchase_units?.[0];
  if (!firstPurchaseUnit || typeof firstPurchaseUnit !== "object") return null;
  const amount = (
    firstPurchaseUnit as { amount?: { currency_code?: string; value?: string } }
  ).amount;
  if (!amount?.currency_code || !amount?.value) return null;
  return { currencyCode: amount.currency_code, value: amount.value };
}

/**
 * Extract first capture id from PayPal capture payload.
 */
export function paypalExtractCaptureId(captureJson: unknown): string | null {
  if (!captureJson || typeof captureJson !== "object") return null;
  const firstPurchaseUnit = (captureJson as { purchase_units?: unknown[] })
    .purchase_units?.[0];
  if (!firstPurchaseUnit || typeof firstPurchaseUnit !== "object") return null;
  const payments = (
    firstPurchaseUnit as { payments?: { captures?: { id?: string }[] } }
  ).payments;
  const firstCaptureId = payments?.captures?.[0]?.id;
  return typeof firstCaptureId === "string" ? firstCaptureId : null;
}

/**
 * Capture PayPal order payment.
 */
export async function paypalCaptureOrder(
  orderId: string,
  options?: { idempotencyKey?: string },
): Promise<{ ok: boolean; json: unknown }> {
  // return capture response body for audit/debug when failures happen.
  // pass idempotency key so duplicate capture calls do not double-charge.
  const token = await getPayPalAccessToken();
  if (!token) return { ok: false, json: { error: "paypal_unconfigured" } };

  const base = getPayPalApiBase();
  let res: Response;
  try {
    res = await retryPayPalRequest("capture-order", () =>
      fetch(
        `${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(options?.idempotencyKey
              ? { "PayPal-Request-Id": options.idempotencyKey }
              : {}),
          },
        },
      ),
    );
  } catch (error) {
    console.error("[paypal] capture order failed", error);
    return { ok: false, json: { error: "paypal_capture_unavailable" } };
  }

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}

/**
 * Verify PayPal webhook signature using PayPal verification endpoint.
 */
export async function paypalVerifyWebhookSignature(params: {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookEvent: unknown;
}): Promise<boolean> {
  const token = await getPayPalAccessToken();
  if (!token) return false;
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId) return false;

  const base = getPayPalApiBase();
  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: params.transmissionId,
      transmission_time: params.transmissionTime,
      cert_url: params.certUrl,
      auth_algo: params.authAlgo,
      transmission_sig: params.transmissionSig,
      webhook_id: webhookId,
      webhook_event: params.webhookEvent,
    }),
  });
  if (!res.ok) return false;
  const json = (await res.json().catch(() => null)) as {
    verification_status?: string;
  } | null;
  return json?.verification_status === "SUCCESS";
}
