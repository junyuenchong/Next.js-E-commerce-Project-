import nodemailer from "nodemailer";

function smtpPass(): string {
  const raw = process.env.EMAIL_PASS?.trim() ?? "";
  return raw.replace(/\s+/g, "");
}

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

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed", e);
    return { ok: false, error: "send_failed" };
  }
}
