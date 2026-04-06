"use client";

import { useEffect } from "react";
import {
  QueryKey,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";

type RealtimeQueryOptions<TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData>,
  "queryKey" | "queryFn"
> & {
  channels?: string | string[];
  /** Polling fallback when SSE is unavailable (e.g. some hosts). */
  fallbackIntervalMs?: number;
  /**
   * When an SSE event arrives, invalidate queries whose keys match.
   * If omitted, only invalidates `queryKey`.
   */
  matchKey?: (queryKey: QueryKey) => boolean;
};

function normalizeChannels(channels?: string | string[]) {
  if (!channels) return [];
  const list = Array.isArray(channels) ? channels : channels.split(",");
  return list
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
    .map((c) => {
      if (c.includes("category")) return "categories";
      if (c.includes("product")) return "products";
      return c;
    });
}

export function useRealtimeQuery<TQueryFnData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options: RealtimeQueryOptions<TQueryFnData> = {},
) {
  const {
    channels,
    matchKey,
    fallbackIntervalMs = 15000,
    ...queryOptions
  } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn,
    ...queryOptions,
  });

  useEffect(() => {
    const normalized = normalizeChannels(channels);
    if (!normalized.length) return;

    const invalidate = () => {
      if (matchKey) {
        queryClient.invalidateQueries({
          predicate: (q) => matchKey(q.queryKey),
        });
      } else {
        queryClient.invalidateQueries({ queryKey });
      }
    };

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(invalidate, fallbackIntervalMs);
    };

    const es = new EventSource(
      `/user/api/events?channels=${encodeURIComponent(normalized.join(","))}`,
    );

    es.onmessage = invalidate;
    // If SSE drops/unsupported, keep data fresh via polling.
    es.onerror = () => startPolling();

    return () => {
      es.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [channels, fallbackIntervalMs, matchKey, queryClient, queryKey]);

  return query;
}
