import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthOptions } from "next-auth";
import type { UserRole } from "@prisma/client";
import prisma from "@/backend/core/db/prisma";
import { verifyPasswordUserService } from "@/backend/modules/user/user.service";
import { loginProvidersFromRow } from "./dto/login-providers.dto";

const userAuthSelect = {
  id: true,
  role: true,
  isActive: true,
  email: true,
  passwordHash: true,
  accounts: { select: { provider: true } },
} as const;

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

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: "/modules/user/auth/sign-in",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim();
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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = String(user.id);
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
        if (user.image) token.picture = user.image;

        const numericId = Number(user.id);
        if (Number.isFinite(numericId)) {
          const db = await prisma.user.findUnique({
            where: { id: numericId },
            select: userAuthSelect,
          });
          if (db) {
            token.role = db.role;
            token.isActive = db.isActive;
            if (db.email) token.email = db.email;
            token.loginProvidersJson = JSON.stringify(
              loginProvidersFromRow(db.passwordHash, db.accounts),
            );
          }
        }
      }
      return token;
    },
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
        session.user.id = String(token.sub);
        session.user.role = token.role as UserRole;
        session.user.isActive = token.isActive !== false;
        session.user.email =
          (token.email as string | undefined) ?? session.user.email ?? "";
        session.user.name =
          (token.name as string | undefined) ?? session.user.name;
        session.user.image =
          (token.picture as string | undefined) ??
          session.user.image ??
          undefined;
        session.user.loginProviders = loginProvidersFromJson(
          token.loginProvidersJson,
        );
        return session;
      }

      const numericId = Number(idStr);
      if (Number.isNaN(numericId)) return session;

      const db = await prisma.user.findUnique({
        where: { id: numericId },
        select: userAuthSelect,
      });
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
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/modules/user/auth/post-login`;
    },
  },
};
