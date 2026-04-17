"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getSession, signIn, signOut } from "next-auth/react";
import type { UserRole } from "@prisma/client";
import { signInCredentialsSchema } from "@/shared/schema";
import { canAccessAdminPanel, postAuthRedirectPath } from "@/backend/lib/auth";
import { useSignInResultAlerts } from "@/app/features/user/hooks/useSignInResultAlerts";

type FormState = { message: string } | undefined;

const POST_LOGIN = "/features/user/auth/post-login";

// Builds the post-login route while preserving an optional return URL.
function withReturnUrl(returnUrl?: string) {
  const t = returnUrl?.trim();
  return !t ? POST_LOGIN : `${POST_LOGIN}?returnUrl=${encodeURIComponent(t)}`;
}

// Hook boundary: keeps the sign-in orchestration (credentials/admin/oauth) out of the UI.
export function useSignInClient(params: {
  returnUrl?: string;
  mode: "customer" | "admin";
}) {
  const { returnUrl, mode } = params;
  const isAdmin = mode === "admin";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<FormState>(undefined);
  const [isPending, setIsPending] = useState(false);

  useSignInResultAlerts(state);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setState(undefined);

    const formData = new FormData(event.currentTarget);
    const parsed = signInCredentialsSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) {
      setState({
        message: "Check your email and password (min. 5 characters).",
      });
      setIsPending(false);
      return;
    }

    const { email, password } = parsed.data;
    if (isAdmin) {
      const adminRes = await fetch("/features/admin/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const adminJson = (await adminRes.json().catch(() => null)) as {
        role?: UserRole;
        message?: string;
      } | null;
      const role = (adminJson?.role ?? null) as UserRole | null;

      if (!adminRes.ok || !role || !canAccessAdminPanel(role)) {
        setState({
          message:
            adminJson?.message ??
            "This portal is for staff and administrators only. Sign in as a customer on the shop page.",
        });
        setIsPending(false);
        return;
      }

      const nextPath = postAuthRedirectPath(role, returnUrl);
      queryClient.removeQueries({ queryKey: ["admin-me"] });
      router.push(nextPath);
      router.refresh();
      setIsPending(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (signInResult?.error) {
      setState({ message: "Invalid email or password." });
      setIsPending(false);
      return;
    }

    let session = await getSession();
    for (let i = 0; i < 3 && !session?.user?.id; i += 1) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
      session = await getSession();
    }
    if (!session?.user?.id) {
      setState({ message: "Could not load session. Please try again." });
      setIsPending(false);
      return;
    }

    const role = (session.user.role ?? "USER") as UserRole;
    if (canAccessAdminPanel(role)) {
      await signOut({ redirect: false });
      setState({
        message:
          "Staff and admin accounts must sign in at Admin sign-in (/features/admin/auth/sign-in).",
      });
      setIsPending(false);
      return;
    }

    router.push(withReturnUrl(returnUrl));
    router.refresh();
    setIsPending(false);
  }

  const oauthSignIn = async (provider: "google" | "facebook") => {
    // OAuth callback uses the same post-login route for cart merge + redirect.
    await signIn(provider, { callbackUrl: withReturnUrl(returnUrl) });
  };

  return { isAdmin, state, isPending, handleSubmit, oauthSignIn };
}
