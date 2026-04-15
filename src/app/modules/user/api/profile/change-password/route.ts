import { NextResponse } from "next/server";
import { changePasswordUserService } from "@/backend/modules/user";
import { updateUserPasswordSchema } from "@/shared/schema/user";
import { clientIp, rateLimit } from "@/app/lib/rate-limit";
import { resolveUserId } from "@/backend/core/session";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const rl = await rateLimit(`change-pw:${ip}`, 10, 3600);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = updateUserPasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await changePasswordUserService(
    userId,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );

  if (!result.ok) {
    const status =
      result.error === "invalid_current"
        ? 401
        : result.error === "no_password" || result.error === "user_not_found"
          ? 400
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
