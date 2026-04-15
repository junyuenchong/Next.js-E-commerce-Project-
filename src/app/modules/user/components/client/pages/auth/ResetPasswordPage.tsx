"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      const res = await fetch("/modules/user/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok) {
        if (res.status === 429) setError("Too many attempts. Try again later.");
        else if (data?.error === "invalid_or_expired")
          setError("This link expired or was already used.");
        else
          setError(
            "Could not reset password. Try again or request a new link.",
          );
        setPending(false);
        return;
      }
      setMessage("Password updated. You can sign in with your new password.");
      setTimeout(() => router.push("/modules/user/auth/sign-in"), 1500);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg shadow-md text-center space-y-4">
        <p className="text-red-600">
          This reset link is invalid or incomplete.
        </p>
        <Link
          href="/modules/user/auth/forgot-password"
          className="text-blue-600 hover:underline text-sm"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-2">Set new password</h1>
      <p className="text-center text-sm text-gray-600 mb-6">
        Choose a strong password for your account.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-4 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className="block text-sm font-medium text-gray-700"
          >
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full px-4 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Update password
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto my-16 p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
