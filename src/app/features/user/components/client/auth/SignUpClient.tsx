"use client";

import React, { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import PasswordInput from "@/app/components/shared/PasswordInput";

type FormState =
  | {
      message: string;
    }
  | undefined;

type SignUpProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
};

const SignUp = ({ action }: SignUpProps) => {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (!state) return;
    if (state.message === "success") {
      const form = document.querySelector("form");
      if (form) {
        const email = (
          form.querySelector('input[name="email"]') as HTMLInputElement
        )?.value;
        const password = (
          form.querySelector('input[name="password"]') as HTMLInputElement
        )?.value;
        if (email && password) {
          void signIn("credentials", {
            email,
            password,
            callbackUrl: "/features/user",
          });
        }
      }
    } else if (state.message) {
      window.alert(`❌ ${state.message}`);
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg shadow-md"
    >
      <h1 className="text-2xl font-bold text-center mb-2">
        Join the DEAL Revolution!
      </h1>
      <p className="text-center text-sm text-rose-600 font-semibold mb-2">
        🔥 LIMITED TIME OFFER 🔥
      </p>
      <p className="text-center text-sm text-gray-600 font-semibold mb-6">
        Sign up now and get 90% OFF your first order!
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            required
            className="w-full px-4 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
            placeholder="Enter your email"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Enter your password"
            inputClassName="w-full px-4 pr-11 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition-colors"
          />
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">
            ⚡️ Only 127 welcome bonus packages remaining
          </p>
          <p className="text-xs text-gray-500 mb-4">
            🕒 Offer expires in: 13:45
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`w-full bg-rose-600 text-white py-3 rounded-md hover:bg-rose-700 transition-colors font-medium flex items-center justify-center gap-2 ${
            isPending ? "cursor-not-allowed" : ""
          }`}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              CREATING ACCOUNT...
            </>
          ) : (
            "CREATE ACCOUNT"
          )}
        </button>

        {state?.message && state.message !== "success" && (
          <p className="text-center text-sm text-red-600">{state.message}</p>
        )}
      </div>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() =>
            void signIn("google", {
              callbackUrl: "/features/user/auth/post-login",
            })
          }
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-md shadow-sm hover:bg-gray-50 transition-colors font-medium"
        >
          <span>Sign up with Google</span>
        </button>
        <button
          type="button"
          onClick={() =>
            void signIn("facebook", {
              callbackUrl: "/features/user/auth/post-login",
            })
          }
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-md shadow-sm hover:bg-blue-700 transition-colors font-medium"
        >
          Sign up with Facebook
        </button>
      </div>
    </form>
  );
};

export default SignUp;
