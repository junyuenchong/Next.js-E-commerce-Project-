"use client";

/**
 * profile page client
 * show profile, linked accounts, and addresses
 */
import Image from "next/image";
import Link from "next/link";
import { formatLoginProviderLabel } from "@/app/lib/auth";
import AddressBookSection from "@/app/features/user/components/client/profile/AddressBookSection";
import PasswordInput from "@/app/components/shared/PasswordInput";
import { useProfilePage } from "@/app/features/user/hooks";

export default function ProfilePage() {
  const {
    user,
    sessionLoading,
    profile,
    profileQuery,
    name,
    setName,
    msg,
    displayName,
    initial,
    memberSince,
    saveProfile,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    pwMsg,
    pwPending,
    changePassword,
    resetPending,
    resetMsg,
    sendResetEmail,
  } = useProfilePage();

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-16 text-center px-4">
        <p className="mb-4">Sign in to manage your profile.</p>
        <Link
          href="/features/user/auth/sign-in"
          className="text-blue-600 font-medium"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="min-h-screen py-16 text-center px-4 bg-gray-50">
        <p className="text-gray-700">Could not load profile.</p>
        <Link href="/features/user" className="text-blue-600 mt-4 inline-block">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h1 className="text-xl font-bold">Profile</h1>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center mx-auto sm:mx-0">
              {profile.image ? (
                <Image
                  src={profile.image}
                  alt=""
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-gray-600">
                  {initial}
                </span>
              )}
            </div>
            <div className="text-center sm:text-left min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate">
                {displayName}
              </p>
              <p className="text-sm text-gray-600 truncate">{profile.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Member since {memberSince}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                Role: {profile.role.toLowerCase()}
              </p>
              <div className="mt-2 flex flex-wrap gap-1 justify-center sm:justify-start">
                <span className="text-xs text-gray-500 w-full sm:w-auto">
                  Sign-in:
                </span>
                {profile.loginProviders.length === 0 ? (
                  <span className="text-xs text-gray-400">—</span>
                ) : (
                  profile.loginProviders.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"
                    >
                      {formatLoginProviderLabel(p)}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <form
            onSubmit={saveProfile}
            className="space-y-3 pt-2 border-t border-gray-100"
          >
            <label className="block text-sm font-medium text-gray-800">
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Save profile
            </button>
          </form>
          {msg && <p className="text-sm text-gray-700">{msg}</p>}
        </div>

        <AddressBookSection />

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>

          {profile.hasPassword ? (
            <>
              <p className="text-sm text-gray-600">
                Change your password by entering your current password and a new
                one (at least 8 characters).
              </p>
              <form onSubmit={changePassword} className="space-y-3">
                <label className="block text-sm font-medium text-gray-800">
                  Current password
                  <PasswordInput
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    wrapperClassName="relative mt-1"
                    inputClassName="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-800">
                  New password
                  <PasswordInput
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    wrapperClassName="relative mt-1"
                    inputClassName="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-gray-800">
                  Confirm new password
                  <PasswordInput
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    wrapperClassName="relative mt-1"
                    inputClassName="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pwPending}
                  className="w-full py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
                >
                  {pwPending ? "Updating…" : "Update password"}
                </button>
              </form>
              {pwMsg && <p className="text-sm text-gray-700">{pwMsg}</p>}

              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-2">
                  Prefer to use the email link? We can send a reset link to{" "}
                  <span className="font-medium text-gray-800">
                    {profile.email}
                  </span>
                  .
                </p>
                <button
                  type="button"
                  onClick={sendResetEmail}
                  disabled={resetPending}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-60"
                >
                  {resetPending ? "Sending…" : "Email me a reset link"}
                </button>
                {resetMsg && (
                  <p className="text-sm text-gray-700 mt-2">{resetMsg}</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              This account does not use a shop password (for example, you may
              have signed in with a social provider). Password change and email
              reset links are only available for accounts that use email and
              password.
            </p>
          )}
        </div>

        <Link
          href="/features/user"
          className="text-sm text-blue-600 hover:underline block text-center"
        >
          ← Back to shop
        </Link>
      </div>
    </div>
  );
}
