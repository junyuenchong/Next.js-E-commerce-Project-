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
    let noEventTimer: ReturnType<typeof setTimeout> | null = null;
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(invalidate, fallbackIntervalMs);
    };
    const resetNoEventTimer = () => {
      if (noEventTimer) clearTimeout(noEventTimer);
      noEventTimer = setTimeout(startPolling, fallbackIntervalMs);
    };

    const es = new EventSource(
      `/user/api/events?channels=${encodeURIComponent(normalized.join(","))}`,
    );
    // If connection is established but no useful events arrive, fallback to polling.
    resetNoEventTimer();

    es.onmessage = (ev) => {
      // If server reports realtime disabled (e.g. Redis not configured), enable polling.
      try {
        const data = JSON.parse(String(ev.data)) as {
          type?: string;
          realtime?: boolean;
        };
        if (data?.type === "status" && data.realtime === false) {
          startPolling();
          return;
        }
        if (data?.type !== "status") {
          resetNoEventTimer();
        }
      } catch {
        // ignore JSON parse errors; still treat as an invalidation signal
      }
      invalidate();
    };
    // If SSE drops/unsupported, keep data fresh via polling.
    es.onerror = () => startPolling();

    return () => {
      es.close();
      if (pollTimer) clearInterval(pollTimer);
      if (noEventTimer) clearTimeout(noEventTimer);
    };
  }, [channels, fallbackIntervalMs, matchKey, queryClient, queryKey]);

  return query;
}
