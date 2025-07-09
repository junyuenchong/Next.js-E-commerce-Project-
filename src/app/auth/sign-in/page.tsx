import { getCurrentSession, loginUser, registerUser } from '@/actions/auth'
import SignIn from '@/components/auth/SignIn';
import { redirect } from 'next/navigation';
import React from 'react'
import zod from 'zod';

// Form validation schema
const SignInSchema = zod.object({
  email: zod.string().email(),
  password: zod.string().min(5),
});

const SignInPage = async () => {
  // Check if user is already logged in
  const { user } = await getCurrentSession();

  // Redirect to home if session exists
  if (user) {
    return redirect("/");
  }

  // Server action for form submission
  const action = async (prevState: any, formData: FormData) => {
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
      return redirect("/");
    }
  };

  // Render SignIn component with action
  return <SignIn action={action} />;
};

export default SignInPage;
