"use client";

import Link from "next/link";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import PasswordInput from "@/app/components/shared/PasswordInput";
import { useResetPasswordForm } from "@/app/features/user/hooks";

function ResetPasswordForm() {
  const {
    token,
    password,
    setPassword,
    confirm,
    setConfirm,
    message,
    error,
    pending,
    onSubmit,
    goForgotPasswordHref,
  } = useResetPasswordForm();

  if (!token) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg shadow-md text-center space-y-4">
        <p className="text-red-600">
          This reset link is invalid or incomplete.
        </p>
        <Link
          href={goForgotPasswordHref}
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
          <PasswordInput
            id="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            wrapperClassName="relative mt-1"
            inputClassName="w-full px-4 pr-11 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label
            htmlFor="confirm"
            className="block text-sm font-medium text-gray-700"
          >
            Confirm password
          </label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            wrapperClassName="relative mt-1"
            inputClassName="w-full px-4 pr-11 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black"
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
          href="/features/user/auth/sign-in"
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
