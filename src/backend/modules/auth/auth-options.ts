/**
 * auth options
 * handle auth options logic
 */
// nextAuth configuration for providers, sessions, and user auth flow.
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthOptions } from "next-auth";
import type { UserRole } from "@prisma/client";
import prisma from "@/backend/core/db/prisma";
import { verifyPasswordUserService } from "@/backend/modules/user/user.service";
import { loginProvidersFromRow } from "./dto/login-providers.dto";
import { normalizeAdminLoginIdentifier } from "./auth.service";

// minimal user fields fetched during auth hydration.
const userAuthSelect = {
  id: true,
  role: true,
  isActive: true,
  email: true,
  passwordHash: true,
  accounts: { select: { provider: true } },
} as const;

// parse login providers JSON, return [] on malformed input.
function loginProvidersFromJson(
  json: unknown,
): ("local" | "google" | "facebook")[] {
  if (json == null) return [];
  try {
    return JSON.parse(String(json)) as ("local" | "google" | "facebook")[];
  } catch {
    return [];
  }
}

function toNumericId(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

async function loadAuthUserById(numericId: number) {
  return prisma.user.findUnique({
    where: { id: numericId },
    select: userAuthSelect,
  });
}

function applyDbUserToToken(
  token: Record<string, unknown>,
  db: {
    role: unknown;
    isActive: boolean;
    email: string | null;
    passwordHash: string | null;
    accounts: { provider: string }[];
  },
) {
  token.role = db.role;
  token.isActive = db.isActive;
  if (db.email) token.email = db.email;
  token.loginProvidersJson = JSON.stringify(
    loginProvidersFromRow(db.passwordHash, db.accounts),
  );
}

function applyAuthUserToToken(
  token: Record<string, unknown>,
  user: {
    id: unknown;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  },
) {
  token.sub = String(user.id);
  if (user.email) token.email = user.email;
  if (user.name) token.name = user.name;
  if (user.image) token.picture = user.image;
}

function setSessionUserFromToken(params: {
  session: { user?: Record<string, unknown> };
  token: Record<string, unknown>;
}) {
  const { session, token } = params;
  if (!session.user) return;

  session.user.id = String(token.sub ?? "");
  if (token.role != null) session.user.role = token.role as UserRole;
  session.user.isActive = token.isActive !== false;
  session.user.email =
    (token.email as string | undefined) ??
    (session.user.email as string | undefined) ??
    "";
  if (token.name != null) session.user.name = token.name as string;
  if (token.picture != null) session.user.image = token.picture as string;
  session.user.loginProviders = loginProvidersFromJson(
    token.loginProvidersJson,
  );
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/features/user/auth/sign-in",
  },
  providers: [
    // enable Google login provider.
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // enable Facebook login provider.
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    // local credentials login (email/password).
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // check username/password only for local-provider users.
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = normalizeAdminLoginIdentifier(credentials.email);
        const user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (!user?.passwordHash) return null;
        if (!user.isActive) return null;
        const valid = await verifyPasswordUserService(
          credentials.password,
          user.passwordHash,
        );
        if (!valid) return null;
        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  session: {
    strategy: "jwt", // store session state in JWT token.
    maxAge: 30 * 24 * 60 * 60, // session validity window is 30 days.
    updateAge: 24 * 60 * 60, // refresh JWT token state every 24 hours.
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  callbacks: {
    // each JWT issuance refreshes token with DB-backed role/provider data.
    async jwt({ token, user }) {
      if (user) {
        applyAuthUserToToken(token as Record<string, unknown>, user);
        const numericId = toNumericId(user.id);
        if (numericId != null) {
          const db = await loadAuthUserById(numericId);
          if (db) applyDbUserToToken(token as Record<string, unknown>, db);
        }
      }
      return token;
    },
    // block inactive users from completing sign-in.
    async signIn({ user }) {
      const email = user?.email?.trim().toLowerCase();
      if (!email) return true;
      const db = await prisma.user.findUnique({ where: { email } });
      if (db && !db.isActive) return false;
      return true;
    },
    async session({ session, token, user }) {
      const idStr =
        user?.id != null
          ? String(user.id)
          : token.sub != null
            ? String(token.sub)
            : undefined;
      if (!session.user || !idStr) return session;

      if (token.role != null) {
        setSessionUserFromToken({
          session: session as { user?: Record<string, unknown> },
          token: token as Record<string, unknown>,
        });
        return session;
      }

      const numericId = toNumericId(idStr);
      if (numericId == null) return session;

      const db = await loadAuthUserById(numericId);
      session.user.id = String(db?.id ?? idStr);
      session.user.role = (db?.role ?? "USER") as UserRole;
      session.user.isActive = db?.isActive ?? true;
      session.user.loginProviders = db
        ? loginProvidersFromRow(db.passwordHash, db.accounts)
        : [];
      const email = user?.email ?? token.email ?? db?.email;
      if (email) session.user.email = email;
      return session;
    },
    // allow only same-origin/safe redirects after login.
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/features/user/auth/post-login`;
    },
  },
};
