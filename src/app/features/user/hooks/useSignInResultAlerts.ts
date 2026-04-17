"use client";

import { useEffect } from "react";

type FormState = { message: string } | undefined;

/** Surface NextAuth `?error=` on the sign-in page once (no `useSearchParams` → no Suspense requirement). */
export function useSignInResultAlerts(state: FormState) {
  void state;
  // Reads NextAuth error once from URL and shows a lightweight alert.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      window.alert(`Sign-in error: ${decodeURIComponent(errorParam)}`);
    }
  }, []);
}
