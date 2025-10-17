"use client";
import { SessionProvider } from "next-auth/react";
import { Session } from "next-auth";
import { ReactNode } from "react";

interface SessionProviderClientProps {
  children: ReactNode;
  session: Session | null;
}

export default function SessionProviderClient({ children, session }: SessionProviderClientProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
} 