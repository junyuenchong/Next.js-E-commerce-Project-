import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { adminApiRequire } from "@/backend/lib/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/lib/admin-action-log";
import { sendTransactionalEmail } from "@/app/lib/email";

type Body = {
  couponId: number;
  userIds: number[];
  /** When true, emails users who have an email address. */
  sendEmail?: boolean;
  /** Optional custom message line in email. */
  message?: string;
};

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await adminApiRequire("coupon.manage");
  if (!g.ok) return g.response;

  const json = (await req.json().catch(() => null)) as Body | null;
  const couponIdRaw = json?.couponId;
  const userIds = Array.isArray(json?.userIds) ? json!.userIds : [];
  const sendEmail = Boolean(json?.sendEmail);
  const message = typeof json?.message === "string" ? json.message.trim() : "";

  const couponId = Number(couponIdRaw);
  if (!Number.isFinite(couponId) || couponId < 1) {
    return NextResponse.json({ error: "invalid_coupon_id" }, { status: 400 });
  }
  const ids = Array.from(
    new Set(
      userIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0),
    ),
  );
  if (ids.length === 0) {
    return NextResponse.json({ error: "empty_selection" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: {
      id: true,
      code: true,
      redemptionScope: true,
      isActive: true,
      endsAt: true,
    },
  });
  if (!coupon || !coupon.isActive) {
    return NextResponse.json({ error: "coupon_not_found" }, { status: 404 });
  }

  // Force targeted scope when assigning to specific users.
  if (coupon.redemptionScope !== "ASSIGNED_USERS") {
    await prisma.coupon.update({
      where: { id: couponId },
      data: { redemptionScope: "ASSIGNED_USERS" },
    });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: ids }, isActive: true, role: "USER" },
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ error: "no_valid_users" }, { status: 400 });
  }

  const created = await prisma.userCouponAssignment.createMany({
    data: users.map((u) => ({ userId: u.id, couponId })),
    skipDuplicates: true,
  });

  const actorId = adminActorNumericId(g.user);
  if (actorId != null) {
    void logAdminAction({
      actorUserId: actorId,
      action: "voucher.bulk_assign",
      targetType: "Coupon",
      targetId: String(couponId),
      metadata: { userCount: users.length, created: created.count, sendEmail },
    });
  }

  let emailed = 0;
  if (sendEmail) {
    const expiry =
      coupon.endsAt != null ? `\nExpires: ${coupon.endsAt.toISOString()}` : "";
    const extra = message ? `\n\n${message}` : "";
    for (const u of users) {
      if (!u.email) continue;
      const r = await sendTransactionalEmail({
        to: u.email,
        subject: `Your voucher code: ${coupon.code}`,
        text:
          `Hi${u.name ? ` ${u.name}` : ""},\n\n` +
          `You have received a voucher for CJY Shop.\n\n` +
          `Code: ${coupon.code}${expiry}\n\n` +
          `Use it on the cart or checkout page.\n` +
          extra,
      });
      if (r.ok) {
        emailed += 1;
        await prisma.userCouponAssignment.updateMany({
          where: { userId: u.id, couponId, emailedAt: null },
          data: { emailedAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    couponId,
    assigned: users.length,
    created: created.count,
    emailed,
  });
}
