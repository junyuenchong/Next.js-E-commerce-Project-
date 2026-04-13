/** OAuth/callback landing: merge guest cart, then role-based redirect. */
import { redirect } from "next/navigation";
import { canAccessAdminPanel, postAuthRedirectPath } from "@/backend/lib/auth";
import { getServerSessionCached } from "@/backend/lib/session";
import { mergeGuestCartToUserService } from "@/backend/modules/cart/cart.service";
import type { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PostLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnUrl?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const session = await getServerSessionCached();
  const user = session?.user;

  if (!user?.id) {
    redirect("/modules/user/auth/sign-in");
  }

  const role = (user.role ?? "USER") as UserRole;
  if (canAccessAdminPanel(role)) {
    redirect(postAuthRedirectPath(role, params.returnUrl));
  }

  await mergeGuestCartToUserService();
  redirect(postAuthRedirectPath(role, params.returnUrl));
}
