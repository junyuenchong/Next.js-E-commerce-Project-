import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getServerSessionCached } from "@/backend/core/session";
import { canAccessAdminPanel } from "@/backend/core/auth/auth.service";

/**
 * Legacy path compatibility:
 * /features/user/admin -> /features/admin/dashboard
 */
export default async function LegacyUserAdminPathRedirect() {
  const session = await getServerSessionCached();
  const role = (session?.user?.role ?? "USER") as UserRole;

  if (canAccessAdminPanel(role)) {
    redirect("/features/admin/dashboard");
  }

  redirect("/features/user");
}
