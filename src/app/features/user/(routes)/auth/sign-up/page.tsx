/** Email/password registration (server action). */
import { registerUser } from "@/backend/modules/user";
import { getServerSessionCached } from "@/backend/core/session";
import { redirect } from "next/navigation";
import React from "react";
import SignUp from "@/app/features/user/components/client/auth/SignUpClient";
import { signUpCredentialsSchema } from "@/shared/schema";

const SignUpPage = async () => {
  const session = await getServerSessionCached();
  const user = session?.user;

  if (user) {
    return redirect("/");
  }

  const action = async (_: unknown, formData: FormData) => {
    "use server";

    const parsed = signUpCredentialsSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) {
      return {
        message: "Invalid form data",
      };
    }

    const { email, password } = parsed.data;
    const { user, error } = await registerUser(email, password);

    if (error) {
      return { message: error };
    } else if (user) {
      // Redirect to sign-in page with pre-filled credentials
      return redirect(
        `/features/user/auth/sign-in?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      );
    }
  };

  return <SignUp action={action} />;
};

export default SignUpPage;
