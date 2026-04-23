import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getServerSessionCached } from "@/backend/core/session";
import { canAccessAdminPanel } from "@/backend/core/auth/auth.service";

/**
 * legacy admin redirect page
 * redirect old user admin path to admin dashboard
 */
export default async function LegacyUserAdminPathRedirect() {
  const session = await getServerSessionCached();
  const role = (session?.user?.role ?? "USER") as UserRole;

  if (canAccessAdminPanel(role)) {
    redirect("/features/admin/dashboard");
  }

  redirect("/features/user");
}
