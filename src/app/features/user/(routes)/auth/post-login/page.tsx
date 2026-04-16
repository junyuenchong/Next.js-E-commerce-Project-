/** OAuth/callback landing: merge guest cart, then role-based redirect. */
import { redirect } from "next/navigation";
import {
  canAccessAdminPanel,
  postAuthRedirectPath,
} from "@/backend/core/auth/auth.service";
import { getServerSessionCached } from "@/backend/core/session";
import { mergeGuestCartToUserService } from "@/backend/modules/cart";
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
    redirect("/features/user/auth/sign-in");
  }

  const role = (user.role ?? "USER") as UserRole;
  if (canAccessAdminPanel(role)) {
    redirect(postAuthRedirectPath(role, params.returnUrl));
  }

  await mergeGuestCartToUserService();
  redirect(postAuthRedirectPath(role, params.returnUrl));
}
