import type { Prisma } from "@prisma/client";
import prisma from "@/app/lib/prisma";

export type AdminAuditAction =
  | "order.status"
  | "order.refund"
  | "voucher.bulk_assign"
  | "support.chat_reply"
  | "user.ban"
  | "user.activate"
  | "user.role_change"
  | "user.profile_update"
  | "user.permission_profile"
  | "product.soft_delete"
  | "product.create"
  | "product.update"
  | "category.create"
  | "category.update"
  | "category.delete"
  | "review.delete"
  | "review.reply"
  | "media.upload"
  | "role.profile_create"
  | "role.profile_rename"
  | "role.permissions_update"
  | "role.profile_remove"
  | "coupon.create"
  | "coupon.update"
  | "coupon.delete";

export function adminActorNumericId(user: { id: string }): number | null {
  const n = Number.parseInt(user.id, 10);
  return Number.isFinite(n) ? n : null;
}

export async function logAdminAction(params: {
  actorUserId: number | null;
  action: AdminAuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.adminActionLog.create({
      data: {
        actorUserId: params.actorUserId ?? undefined,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: (params.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  } catch (e) {
    console.error("[admin-action-log] write failed", e);
  }
}
