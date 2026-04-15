import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import type { AdminActionLogInput } from "@/shared/types/admin-action-log";

function toJsonValue(
  input: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (input === undefined) return Prisma.JsonNull;
  return input as Prisma.InputJsonValue;
}

export async function createAdminActionLogRecord(
  input: AdminActionLogInput,
): Promise<void> {
  await prisma.adminActionLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: toJsonValue(input.metadata),
    },
  });
}
