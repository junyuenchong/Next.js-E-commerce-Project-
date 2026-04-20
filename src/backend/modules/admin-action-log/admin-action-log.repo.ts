/**
 * admin action log repo
 * handle admin action log repo logic
 */
// persists admin action log records with JSON-safe metadata normalization.
import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import type { AdminActionLogInput } from "@/shared/types";

// convert value to Prisma-compatible JSON, using JsonNull for undefined.
function toJsonValue(
  input: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (input === undefined) return Prisma.JsonNull;
  return input as Prisma.InputJsonValue;
}

// insert new admin action log record into database.
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
