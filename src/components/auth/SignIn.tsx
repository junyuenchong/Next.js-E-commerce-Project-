"use client"

import React, { useActionState, useEffect } from 'react'
import Form from 'next/form'
import { Loader2 } from 'lucide-react'

const initialState = {
  message: '',
}

// Form action prop for signup
type SignInProps = {
  action: (prevState: any, formData: FormData) => Promise<{ message: string } | undefined>
}

const SignIn = ({ action }: SignInProps) => {
  // Handle form state and submission
  const [state, formAction, isPending] = useActionState(action, undefined)

  // Show alert on result message
  useEffect(() => {
    if (!state) return
    if (state.message === 'success') {
      alert('🎉 SignIn successful! Redirecting...')
    } else if (state.message) {
      alert(`❌ ${state.message}`)
    }
  }, [state])

  return (
    <Form
      action={formAction}
      className='max-w-md mx-auto my-16 p-8 bg-white rounded-lg shadow-md'
    >
      {/* Headings */}
      <h1 className='text-2xl font-bold text-center mb-2'>Welcome Back!</h1>
      <p className='text-center text-sm text-rose-600 font-semibold mb-2'>🔥 MEMBER EXCLUSIVE🔥</p>
      <p className='text-center text-sm text-gray-600 font-semibold mb-6'>
        Sign in to access your exclusive member deals. 
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
            autoComplete='password'
            required
            className='w-full px-4 border h-10 border-gray-200 rounded-md focus:ring-2 focus:ring-black focus:border-transparent transition-colors'
            placeholder='Enter your password'
          />
        </div>

        {/* Offer notes */}
        <div className='text-center'>
          <p className='text-xs text-gray-500 mb-2'>
            ⚡️ Members save an extra 15% on all orders!
          </p>
          <p className='text-xs text-gray-500 mb-4'>🛍️  Plug get free shipping on orders over RM 15.00</p>
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
             SIGNING IN...
            </>
          ) : (
            'SIGN IN'
          )}
        </button>

        {state?.message && state.message.length > 0 &&(

          <p className='text-center text-sm text-red-600'>
          {state.message}
          </p>
        )}
      </div>
    </Form>
  )
}

export default SignIn
