/**
 * Admin HTTP route: user-vouchers/bulk.
 */

import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { adminApiRequire } from "@/backend/core/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { sendTransactionalEmail } from "@/backend/modules/notification";
import { jsonInternalServerError } from "@/backend/lib/api-error";

type Body = {
  couponId: number;
  userIds: number[];
  /** When true, emails users who have an email address. */
  sendEmail?: boolean;
  /** Optional custom message line in email. */
  message?: string;
};

export const dynamic = "force-dynamic";

// Bulk-assign a targeted coupon to selected customer accounts (optionally email them).
export async function POST(req: Request) {
  try {
    const guard = await adminApiRequire("coupon.manage");
    if (!guard.ok) return guard.response;

    const json = (await req.json().catch(() => null)) as Body | null;
    const couponIdRaw = json?.couponId;
    const selectedUserIds = Array.isArray(json?.userIds) ? json!.userIds : [];
    const sendEmail = Boolean(json?.sendEmail);
    const emailMessage =
      typeof json?.message === "string" ? json.message.trim() : "";

    const couponId = Number(couponIdRaw);
    if (!Number.isFinite(couponId) || couponId < 1) {
      return NextResponse.json({ error: "invalid_coupon_id" }, { status: 400 });
    }
    const uniqueUserIds = Array.from(
      new Set(
        selectedUserIds
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    );
    if (uniqueUserIds.length === 0) {
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

    if (coupon.redemptionScope !== "ASSIGNED_USERS") {
      // Business rule: this bulk assignment flow only supports targeted coupons.
      return NextResponse.json(
        { error: "coupon_not_assignable_to_users" },
        { status: 400 },
      );
    }

    const targetUsers = await prisma.user.findMany({
      where: { id: { in: uniqueUserIds }, isActive: true, role: "USER" },
      select: { id: true, email: true, name: true },
    });

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: "no_valid_users" }, { status: 400 });
    }

    const created = await prisma.userCouponAssignment.createMany({
      data: targetUsers.map((u) => ({ userId: u.id, couponId })),
      skipDuplicates: true,
    });

    const actorId = adminActorNumericId(guard.user);
    if (actorId != null) {
      void logAdminAction({
        actorUserId: actorId,
        action: "voucher.bulk_assign",
        targetType: "Coupon",
        targetId: String(couponId),
        metadata: {
          userCount: targetUsers.length,
          created: created.count,
          sendEmail,
        },
      });
    }

    let emailed = 0;
    if (sendEmail) {
      const expiry =
        coupon.endsAt != null
          ? `\nExpires: ${coupon.endsAt.toISOString()}`
          : "";
      const extra = emailMessage ? `\n\n${emailMessage}` : "";
      for (const u of targetUsers) {
        if (!u.email) continue;
        const emailResult = await sendTransactionalEmail({
          to: u.email,
          subject: `Your voucher code: ${coupon.code}`,
          text:
            `Hi${u.name ? ` ${u.name}` : ""},\n\n` +
            `You have received a voucher for CJY Shop.\n\n` +
            `Code: ${coupon.code}${expiry}\n\n` +
            `Use it on the cart or checkout page.\n` +
            extra,
        });
        if (emailResult.ok) {
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
      assigned: targetUsers.length,
      created: created.count,
      emailed,
    });
  } catch (error) {
    return jsonInternalServerError(
      error,
      "[admin/api/user-vouchers/bulk POST]",
    );
  }
}
