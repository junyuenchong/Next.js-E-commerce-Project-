"use client";
import React, { createContext, useContext } from "react";
import { useDispatch } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSession } from "@/app/modules/user/components/client/http";
import { useUserSessionSync } from "@/app/modules/user/hooks";

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

declare global {
  interface Window {
    __cartMerged?: boolean;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["user-session"],
    queryFn: fetchSession,
    refetchInterval: 60000,
  });
  const dispatch = useDispatch();

  useUserSessionSync(data, isLoading, dispatch, queryClient);
  return (
    <UserContext.Provider
      value={{ user: data?.user ? (data.user as User) : null, isLoading }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
