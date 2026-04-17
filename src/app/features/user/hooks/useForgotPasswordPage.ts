"use client";

import { useState } from "react";

// Keep forgot-password form logic out of the component.
export function useForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setPending(true);

    const form = event.currentTarget;
    const email = (new FormData(form).get("email") as string)?.trim();
    if (!email) {
      setError("Enter your email.");
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/features/user/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        error?: string;
      } | null;
      if (!response.ok) {
        if (response.status === 429)
          setError("Too many attempts. Try again later.");
        else setError("Something went wrong. Try again.");
        setPending(false);
        return;
      }
      setMessage(
        payload?.message ??
          "If an account exists for that email, we sent reset instructions.",
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return { message, error, pending, onSubmit };
}
