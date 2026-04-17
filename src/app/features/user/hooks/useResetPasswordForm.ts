"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Keep reset-password form logic out of the component.
export function useResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!token) {
      setError(
        "Missing or invalid reset link. Request a new one from forgot password.",
      );
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/features/user/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok) {
        if (response.status === 429)
          setError("Too many attempts. Try again later.");
        else if (payload?.error === "invalid_or_expired")
          setError("This link expired or was already used.");
        else
          setError(
            "Could not reset password. Try again or request a new link.",
          );
        setPending(false);
        return;
      }
      setMessage("Password updated. You can sign in with your new password.");
      setTimeout(() => router.push("/features/user/auth/sign-in"), 1500);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return {
    token,
    password,
    setPassword,
    confirm,
    setConfirm,
    message,
    error,
    pending,
    onSubmit,
    goForgotPasswordHref: "/features/user/auth/forgot-password",
  };
}
