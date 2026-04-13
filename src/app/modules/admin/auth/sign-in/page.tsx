/** Admin sign-in; redirects if already authenticated. */
import { getServerSessionCached } from "@/backend/lib/session";
import { canAccessAdminPanel, postAuthRedirectPath } from "@/backend/lib/auth";
import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import AdminSignInClient from "@/app/modules/admin/client/components/auth/AdminSignInClient";

export const dynamic = "force-dynamic";

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnUrl?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const returnUrl = params.returnUrl;

  const session = await getServerSessionCached();
  if (session?.user?.id) {
    const role = (session.user.role ?? "USER") as UserRole;
    if (canAccessAdminPanel(role)) {
      redirect(postAuthRedirectPath(role, returnUrl));
    }
    redirect("/modules/user/auth/sign-in");
  }

  return <AdminSignInClient returnUrl={returnUrl} />;
}
