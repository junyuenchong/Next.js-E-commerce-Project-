"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { fetchSession } from "@/app/lib/api/user";
import { useUserSessionSync } from "@/app/features/user/hooks/useUserSessionSync";

type SessionUser = {
  id: number | string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string | null;
  loginProviders?: ("local" | "google" | "facebook")[];
};

// Provider-level hook: fetches the NextAuth session and coordinates cross-slice sync (cart merge/hydration).
export function useUserSession() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const query = useQuery({
    queryKey: ["user-session"],
    queryFn: fetchSession,
    refetchInterval: 60_000,
  });

  useUserSessionSync(query.data, query.isLoading, dispatch, queryClient);

  return {
    user: query.data?.user ? (query.data.user as SessionUser) : null,
    isLoading: query.isLoading,
  };
}
