import { NextResponse } from "next/server";
import { z } from "zod";
import { consumePasswordResetToken } from "@/app/lib/password-reset";
import { clientIp, rateLimit } from "@/app/lib/rate-limit";
import { hashPasswordUserService } from "@/backend/modules/user/user.service";

const bodySchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = await rateLimit(`reset-pw:${ip}`, 10, 3600);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const passwordHash = await hashPasswordUserService(parsed.data.password);

  const result = await consumePasswordResetToken(
    parsed.data.token,
    passwordHash,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
