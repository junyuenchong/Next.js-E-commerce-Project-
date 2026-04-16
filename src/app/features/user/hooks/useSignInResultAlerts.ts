"use client";

import { useEffect } from "react";

type FormState = { message: string } | undefined;

/** Surface NextAuth `?error=` on the sign-in page once (no `useSearchParams` → no Suspense requirement). */
export function useSignInResultAlerts(state: FormState) {
  void state;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      window.alert(`Sign-in error: ${decodeURIComponent(err)}`);
    }
  }, []);
}
