/**
 * customer sign-in page
 * redirect when already logged in
 */
import { getServerSessionCached } from "@/backend/core/session";
import { postAuthRedirectPath } from "@/backend/core/auth/auth.service";
import type { UserRole } from "@prisma/client";

import { redirect } from "next/navigation";
import React from "react";
import SignIn from "@/app/features/user/components/client/auth/SignInClient";

const SignInPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{ returnUrl?: string }>;
}) => {
  const params = searchParams ? await searchParams : {};
  const returnUrl = params.returnUrl;

  const session = await getServerSessionCached();
  const user = session?.user;

  if (user?.id) {
    const role = (user.role ?? "USER") as UserRole;
    redirect(postAuthRedirectPath(role, returnUrl));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-2 text-center">
          Customer sign-in
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Storefront & member deals — not the admin dashboard.
        </p>
        <SignIn returnUrl={returnUrl} />
      </div>
    </div>
  );
};

export default SignInPage;
