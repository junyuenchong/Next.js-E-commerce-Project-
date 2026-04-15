"use client";

import type { ReactNode } from "react";
import type { Session } from "next-auth";
import SessionProviderClient from "./SessionProviderClient";
import { UserProvider } from "@/app/modules/user/components/client/UserContext";

type UserAppProviderProps = {
  session: Session | null;
  children: ReactNode;
};

export default function UserAppProvider({
  session,
  children,
}: UserAppProviderProps) {
  return (
    <SessionProviderClient session={session}>
      <UserProvider>{children}</UserProvider>
    </SessionProviderClient>
  );
}
