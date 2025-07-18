import { registerUser } from '@/actions/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import React from 'react';
import zod from 'zod';
import SignUp from '../components/auth/SignUp';

const SignUpSchema = zod.object({
  email: zod.string().email(),
  password: zod.string().min(5),
});

const SignUpPage = async () => {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (user) {
    return redirect("/");
  }

  const action = async (_: unknown, formData: FormData) => {
    "use server";

    const parsed = SignUpSchema.safeParse(Object.fromEntries(formData));
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
      return redirect(`/user/auth/sign-in?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
    }
  };

  return <SignUp action={action} />;
};

export default SignUpPage;
