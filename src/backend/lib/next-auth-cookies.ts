/**
 * Cookie names for logout — must match NextAuth `defaultCookies` (see `authOptions` without custom `cookies`).
 * Aligns with `getToken` defaults in `next-auth/jwt`.
 */
function secureCookieFromEnv(): boolean {
  return (
    process.env.NEXTAUTH_URL?.startsWith("https://") ?? !!process.env.VERCEL
  );
}

const secure = secureCookieFromEnv();
const prefix = secure ? "__Secure-" : "";

const sessionTokenName = `${prefix}next-auth.session-token`;

/** Names to clear on server-side logout. */
export const nextAuthClearableCookieNames = [
  sessionTokenName,
  `${prefix}next-auth.callback-url`,
  secure ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
];
