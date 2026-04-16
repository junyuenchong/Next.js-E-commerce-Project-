// Feature: Sends transactional emails via SMTP with resilient error-safe wrappers.
import nodemailer from "nodemailer";
import { runSafely } from "@/backend/shared/async-safety";

function smtpPass(): string {
  // Normalizes whitespace because some providers copy app passwords with spaces.
  const raw = process.env.EMAIL_PASS?.trim() ?? "";
  return raw.replace(/\s+/g, "");
}

// Send a transactional email via SMTP, returning a structured result.
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = process.env.EMAIL_USER?.trim();
  const pass = smtpPass();
  const from =
    process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || user;

  if (!user || !pass || !from) {
    // Fail fast when SMTP is not configured; callers can choose fallback behavior.
    return { ok: false, error: "email_unconfigured" };
  }

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT?.trim() || "465");
  const secure =
    (process.env.SMTP_SECURE?.trim() ?? "1") === "1" || port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return runSafely<{ ok: true } | { ok: false; error: string }>(
    async () => {
      // Sending is wrapped so mail failures never crash business flows.
      await transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      return { ok: true };
    },
    (e) => {
      console.error("[email] send failed", e);
      return { ok: false, error: "send_failed" };
    },
  );
}
