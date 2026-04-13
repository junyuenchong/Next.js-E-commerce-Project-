/**
 * PayPal REST (server-side). Uses PAYPAL_CLIENT_ID + PAYPAL_SECRET_KEY (or PAYPAL_CLIENT_SECRET).
 * API host defaults to sandbox; set PAYPAL_API_BASE for live: https://api-m.paypal.com
 */

type PayPalTokenResponse = {
  access_token: string;
  expires_in: number;
};

let cachedToken: { value: string; expiresAtMs: number } | null = null;

export function getPayPalApiBase(): string {
  const explicit = process.env.PAYPAL_API_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const legacy = process.env.PAYPAL_API?.trim();
  if (legacy?.includes("api-m.paypal.com")) return legacy.replace(/\/$/, "");
  return "https://api-m.sandbox.paypal.com";
}

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

export async function getPayPalAccessToken(): Promise<string | null> {
  const creds = getClientCredentials();
  if (!creds) return null;

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 30_000) {
    return cachedToken.value;
  }

  const base = getPayPalApiBase();
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.id}:${creds.secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

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

export async function paypalCreateOrder(body: {
  currencyCode: string;
  value: string;
}): Promise<{ id: string } | null> {
  const token = await getPayPalAccessToken();
  if (!token) return null;

  const base = getPayPalApiBase();
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
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
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[paypal] create order", res.status, text);
    return null;
  }

  const data = (await res.json()) as { id?: string };
  return data.id ? { id: data.id } : null;
}

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

export function paypalOrderAmount(
  order: unknown,
): { currencyCode: string; value: string } | null {
  if (!order || typeof order !== "object") return null;
  const pu = (order as { purchase_units?: unknown[] }).purchase_units?.[0];
  if (!pu || typeof pu !== "object") return null;
  const amt = (pu as { amount?: { currency_code?: string; value?: string } })
    .amount;
  if (!amt?.currency_code || !amt?.value) return null;
  return { currencyCode: amt.currency_code, value: amt.value };
}

/** First capture id from PayPal capture response JSON, if present. */
export function paypalExtractCaptureId(captureJson: unknown): string | null {
  if (!captureJson || typeof captureJson !== "object") return null;
  const pu = (captureJson as { purchase_units?: unknown[] })
    .purchase_units?.[0];
  if (!pu || typeof pu !== "object") return null;
  const payments = (pu as { payments?: { captures?: { id?: string }[] } })
    .payments;
  const id = payments?.captures?.[0]?.id;
  return typeof id === "string" ? id : null;
}

export async function paypalCaptureOrder(
  orderId: string,
): Promise<{ ok: boolean; json: unknown }> {
  const token = await getPayPalAccessToken();
  if (!token) return { ok: false, json: { error: "paypal_unconfigured" } };

  const base = getPayPalApiBase();
  const res = await fetch(
    `${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}
