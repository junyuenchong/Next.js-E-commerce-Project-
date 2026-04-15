import type { AdminActionLogInput } from "@/shared/types/admin-action-log";
import { createAdminActionLogRecord } from "./admin-action-log.repo";

export function adminActorNumericId(
  user: { id?: string | number | null } | null | undefined,
): number | null {
  const raw = user?.id;
  if (raw == null) return null;
  const id = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function logAdminAction(
  input: AdminActionLogInput,
): Promise<void> {
  try {
    await createAdminActionLogRecord(input);
  } catch (error) {
    console.error("[admin-action-log]", error);
  }
}
