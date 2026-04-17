import { NextResponse } from "next/server";
import { cancelExpiredPaymentsRepo } from "@/backend/modules/payment";

// Cron endpoint: auto-cancel stale pending/processing payments.
export async function POST(request: Request) {
  const startedAtMs = Date.now();
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (expectedSecret) {
    const provided = request.headers.get("x-cron-secret")?.trim();
    if (!provided || provided !== expectedSecret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const result = await cancelExpiredPaymentsRepo(new Date());
  return NextResponse.json({
    ok: true,
    updated: result.updated,
    handledInMs: Date.now() - startedAtMs,
  });
}
