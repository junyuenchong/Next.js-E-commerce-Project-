import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import type { AuthOptions } from "next-auth";

console.log("NEXTAUTH_SECRET at runtime:", process.env.NEXTAUTH_SECRET);

type SessionUserWithId = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  pages: {
    signIn: '/user/auth/sign-in',
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
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('CredentialsProvider authorize called with:', credentials);
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        console.log('User found:', user);
        if (user && user.passwordHash) {
          const bcrypt = await import('bcryptjs');
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          console.log('Password valid:', valid);
          if (valid) {
            console.log('Returning user for session:', { id: String(user.id), email: user.email, name: user.name });
            return { id: String(user.id), email: user.email, name: user.name };
          }
        }
        console.log('Invalid credentials');
        return null;
      }
    })
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async session({ session, user, token }) {
      console.log('Session callback called:', { session, user, token });
      // For database sessions, user is available; for JWT, use token.sub
      if (session.user) {
        if (user?.id) {
          (session.user as SessionUserWithId).id = String(user.id);
        } else if (token?.sub) {
          (session.user as SessionUserWithId).id = String(token.sub);
        }
        if (user?.email) {
          session.user.email = user.email;
        } else if (token?.email) {
          session.user.email = token.email;
        }
      }
      console.log('Session returned to client:', session);
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/user`;
    },
  },
}; 