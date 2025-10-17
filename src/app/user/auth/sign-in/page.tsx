import { loginUser } from "@/actions/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

import { redirect } from "next/navigation";
import React from "react";
import zod from "zod";
import SignIn from "../components/auth/SignIn";

// Form validation schema
const SignInSchema = zod.object({
  email: zod.string().email(),
  password: zod.string().min(5),
});

const SignInPage = async ({ searchParams }: { searchParams?: Promise<{ returnUrl?: string }> }) => {
  const params = searchParams ? await searchParams : {};
  const returnUrl = params.returnUrl;
  
  // Check if user is already logged in
  const session = await getServerSession(authOptions);
  const user = session?.user;

  // Redirect to return URL or home if session exists
  if (user) {
    return redirect(returnUrl || "/");
  }

  // Server action for form submission
  const action = async (_: unknown, formData: FormData) => {
    "use server";

    // Validate form data
    const parsed = SignInSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { message: "Invalid form data" };
    }

    const { email, password } = parsed.data;

    // Attempt login
    const { user, error } = await loginUser(email, password);
    if (error) {
      return { message: error };
    } else if (user) {
      // Redirect to return URL or home after successful login
      return redirect(returnUrl || "/");
    }
  };

  // Render SignIn component with action and return URL
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
        <SignIn action={action} />
        {/* <SignInButtons /> removed because the component does not exist */}
      </div>
    </div>
  );
};

export default SignInPage;
