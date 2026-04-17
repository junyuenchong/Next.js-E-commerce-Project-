"use client";
import React, { createContext, useContext } from "react";
import { useUserSession } from "@/app/features/user/hooks";

type User = {
  id: number | string;
  email: string;
  name?: string | null;
  image?: string | null;
  /** Present when session includes role (NextAuth + custom session). */
  role?: string | null;
  /** Sign-in methods linked to this account (local = email/password). */
  loginProviders?: ("local" | "google" | "facebook")[];
};

type UserContextType = { user: User | null; isLoading: boolean };
const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Provider is intentionally thin; orchestration lives in hooks.
  const { user, isLoading } = useUserSession();
  return (
    <UserContext.Provider
      value={{ user: user ? (user as User) : null, isLoading }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
