import { NextResponse } from "next/server";
import { z } from "zod";
import { getSiteUrl } from "@/app/lib/site-url";
import { createPasswordResetForEmail } from "@/backend/modules/auth";
import { clientIp, rateLimit } from "@/app/lib/rate-limit";
import { sendTransactionalEmail } from "@/backend/modules/notification";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = await rateLimit(`forgot-pw:${ip}`, 5, 3600);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const tokenData = await createPasswordResetForEmail(parsed.data.email);
  if (tokenData) {
    const url = `${getSiteUrl()}/features/user/auth/reset-password?token=${encodeURIComponent(tokenData.rawToken)}`;
    await sendTransactionalEmail({
      to: parsed.data.email,
      subject: "Reset your CJY Shop password",
      text: `We received a request to reset your password.\n\nOpen this link within 1 hour:\n${url}\n\nIf you did not request this, ignore this email.`,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "If an account exists for that email, we sent reset instructions.",
  });
}
