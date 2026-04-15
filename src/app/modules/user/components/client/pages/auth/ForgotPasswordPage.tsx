"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const email = (new FormData(form).get("email") as string)?.trim();
    if (!email) {
      setError("Enter your email.");
      setPending(false);
      return;
    }
    try {
      const res = await fetch("/modules/user/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        if (res.status === 429) setError("Too many attempts. Try again later.");
        else setError("Something went wrong. Try again.");
        setPending(false);
        return;
      }
      setMessage(
        data?.message ??
          "If an account exists for that email, we sent reset instructions.",
      );
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-2">Forgot password</h1>
      <p className="text-center text-sm text-gray-600 mb-6">
        Enter your account email. We will send a reset link if the account
        exists.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full px-4 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
          placeholder="you@example.com"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send reset link
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        <Link
          href="/modules/user/auth/sign-in"
          className="text-blue-600 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
