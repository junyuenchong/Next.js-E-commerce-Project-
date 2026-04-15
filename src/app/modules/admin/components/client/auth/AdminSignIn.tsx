"use client";

import SessionProviderClient from "@/app/providers/SessionProviderClient";
import SignIn from "@/app/modules/user/components/client/auth/SignInClient";

export default function AdminSignInClient({
  returnUrl,
}: {
  returnUrl?: string;
}) {
  return (
    <SessionProviderClient session={null}>
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
        <div className="w-full max-w-md">
          <SignIn returnUrl={returnUrl} mode="admin" />
        </div>
      </div>
    </SessionProviderClient>
  );
}
