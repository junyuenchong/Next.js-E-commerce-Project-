/** OAuth/callback landing: merge guest cart, then role-based redirect. */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  canAccessAdminPanel,
  postAuthRedirectPath,
} from "@/backend/core/auth/auth.service";
import { getServerSessionCached } from "@/backend/core/session";
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

  // Important: merge/cookie writes must happen in a Route Handler or Server Action.
  // Calling `mergeGuestCartToUserService()` directly from this Server Component
  // violates Next.js cookies write constraints.
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";
  try {
    // Forward the incoming Cookie header so the merge route can read/update guestCartId.
    const cookie = h.get("cookie") ?? "";
    if (origin) {
      await fetch(`${origin}/features/user/api/products/cart/merge`, {
        method: "POST",
        headers: { cookie },
        cache: "no-store",
      });
    }
  } catch (e) {
    // Merge failure should not block login redirect.
    console.error("[post-login] guest cart merge failed:", e);
  }
  redirect(postAuthRedirectPath(role, params.returnUrl));
}
