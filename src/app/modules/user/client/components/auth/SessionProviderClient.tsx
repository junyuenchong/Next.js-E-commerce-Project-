"use client";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { ReactNode } from "react";

const NEXTAUTH_BASE_PATH = "/modules/user/api/auth";

interface SessionProviderClientProps {
  children: ReactNode;
  session: Session | null;
}

export default function SessionProviderClient({
  children,
  session,
}: SessionProviderClientProps) {
  return (
    <SessionProvider
      basePath={NEXTAUTH_BASE_PATH}
      session={session}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
