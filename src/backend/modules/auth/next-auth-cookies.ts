function secureCookieFromEnv(): boolean {
  return (
    process.env.NEXTAUTH_URL?.startsWith("https://") ?? !!process.env.VERCEL
  );
}

const secure = secureCookieFromEnv();
const prefix = secure ? "__Secure-" : "";
const sessionTokenName = `${prefix}next-auth.session-token`;

export const nextAuthClearableCookieNames = [
  sessionTokenName,
  `${prefix}next-auth.callback-url`,
  secure ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
];
