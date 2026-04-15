/** Admin sign-in; redirects if already authenticated. */
import { getCurrentAdminUser } from "@/backend/core/session";
import { postAuthRedirectPath } from "@/backend/core/auth/auth.service";
import { redirect } from "next/navigation";
import AdminSignInClient from "@/app/modules/admin/components/client/auth/AdminSignInClient";

export const dynamic = "force-dynamic";

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnUrl?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const returnUrl = params.returnUrl;

  const adminUser = await getCurrentAdminUser();
  if (adminUser?.id) {
    redirect(postAuthRedirectPath(adminUser.role, returnUrl));
  }

  return <AdminSignInClient returnUrl={returnUrl} />;
}
