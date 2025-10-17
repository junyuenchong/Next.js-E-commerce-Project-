"use client"

import React, { useActionState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { signIn } from "next-auth/react";

// Define expected structure of form state
type FormState = {
  message: string
} | undefined

// Form action prop for signup
type SignUpProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>
}

const SignUp = ({ action }: SignUpProps) => {
  // Handle form state and submission
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, undefined)

  // Show alert on result message
  useEffect(() => {
    if (!state) return;
    if (state.message === 'success') {
      // Auto-login after successful registration
      const form = document.querySelector('form');
      if (form) {
        const email = (form.querySelector('input[name="email"]') as HTMLInputElement)?.value;
        const password = (form.querySelector('input[name="password"]') as HTMLInputElement)?.value;
        if (email && password) {
          signIn('credentials', { email, password, callbackUrl: '/' });
        }
      }
    } else if (state.message) {
      alert(`❌ ${state.message}`);
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className='max-w-md mx-auto my-16 p-8 bg-white rounded-lg shadow-md'
    >
      {/* Headings */}
      <h1 className='text-2xl font-bold text-center mb-2'>Join the DEAL Revolution!</h1>
      <p className='text-center text-sm text-rose-600 font-semibold mb-2'>🔥 LIMITED TIME OFFER 🔥</p>
      <p className='text-center text-sm text-gray-600 font-semibold mb-6'>
        Sign up now and get 90% OFF your first order!
      </p>

      <div className='space-y-6'>
        {/* Email input */}
        <div className='space-y-2'>
          <label htmlFor="email" className='block text-sm font-medium text-gray-700'>
            Email address
          </label>
          <input
            type='email'
            id='email'
            name='email'
            autoComplete='email'
            required
            className='w-full px-4 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition-colors'
            placeholder='Enter your email'
          />
        </div>

        {/* Password input */}
        <div className='space-y-2'>
          <label htmlFor="password" className='block text-sm font-medium text-gray-700'>
            Password
          </label>
          <input
            type='password'
            id='password'
            name='password'
            autoComplete='new-password'
            required
            className='w-full px-4 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition-colors'
            placeholder='Enter your password'
          />
        </div>

        {/* Offer notes */}
        <div className='text-center'>
          <p className='text-xs text-gray-500 mb-2'>
            ⚡️ Only 127 welcome bonus packages remaining
          </p>
          <p className='text-xs text-gray-500 mb-4'>🕒 Offer expires in: 13:45</p>
        </div>

        {/* Submit button */}
        <button
          type='submit'
          disabled={isPending}
          className={`w-full bg-rose-600 text-white py-3 rounded-md hover:bg-rose-700 transition-colors font-medium flex items-center justify-center gap-2 ${isPending ? 'cursor-not-allowed' : ''
            }`}
        >
          {isPending ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              CREATING ACCOUNT...
            </>
          ) : (
            'CREATE ACCOUNT'
          )}
        </button>

        {state?.message && state.message !== 'success' && (
          <p className='text-center text-sm text-red-600'>
            {state.message}
          </p>
        )}
      </div>
      {/* OAuth registration buttons */}
      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={() => signIn("google")}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 rounded-md shadow-sm hover:bg-gray-50 transition-colors font-medium"
        >
          <svg className="h-5 w-5" viewBox="0 0 48 48"><g><path d="M44.5 20H24v8.5h11.7C34.7 33.1 30.1 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z" fill="#FFC107"/><path d="M6.3 14.7l7 5.1C15.1 17.1 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 6.5 29.6 4 24 4c-7.2 0-13.3 4.1-16.7 10.7z" fill="#FF3D00"/><path d="M24 44c5.5 0 10.4-1.8 14.3-4.9l-6.6-5.4C29.7 35.5 27 36.5 24 36.5c-6.1 0-10.7-3.9-12.5-9.1l-7 5.4C7.7 39.9 15.2 44 24 44z" fill="#4CAF50"/><path d="M44.5 20H24v8.5h11.7c-1.1 3.1-4.1 5.5-7.7 5.5-2.2 0-4.2-.7-5.7-2.1l-7 5.4C15.1 41.1 19.2 44 24 44c8.8 0 16.3-4.1 19.7-10.7l-7-5.3c-1.8 3.2-5.1 5.5-8.7 5.5z" fill="#1976D2"/></g></svg>
          Sign up with Google
        </button>
        <button
          type="button"
          onClick={() => signIn("facebook")}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-md shadow-sm hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.326 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0"/></svg>
          Sign up with Facebook
        </button>
      </div>
    </form>
  )
}

export default SignUp
