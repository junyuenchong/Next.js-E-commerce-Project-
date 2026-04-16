// Feature: Records structured admin audit entries and normalizes actor identifiers for logs.
import type { AdminActionLogInput } from "@/shared/types";
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
  // Fire-and-forget audit log write; errors are swallowed to avoid breaking core flows.
  try {
    await createAdminActionLogRecord(input);
  } catch (error) {
    console.error("[admin-action-log]", error);
  }
}
