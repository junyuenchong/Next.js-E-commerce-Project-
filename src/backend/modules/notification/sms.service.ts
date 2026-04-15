export type SendSmsResult =
  | { ok: true; sid: string }
  | { ok: false; error: string; status?: number };

export async function sendTwilioSms(params: {
  to: string;
  body: string;
}): Promise<SendSmsResult> {
  const sid =
    process.env.TWILIO_SID?.trim() || process.env.TWILIO_ACCOUNT_SID?.trim();
  const token =
    process.env.TWILIO_AUTH?.trim() || process.env.TWILIO_AUTH_TOKEN?.trim();
  const from =
    process.env.TWILIO_FROM?.trim() || process.env.TWILIO_FROM_NUMBER?.trim();

  if (!sid || !token || !from) {
    return { ok: false, error: "twilio_unconfigured" };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;

  const body = new URLSearchParams();
  body.set("To", params.to);
  body.set("From", from);
  body.set("Body", params.body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const json = (await res.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    error_message?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: json.message || json.error_message || "twilio_request_failed",
    };
  }

  if (!json.sid) return { ok: false, error: "twilio_no_sid" };
  return { ok: true, sid: json.sid };
}
