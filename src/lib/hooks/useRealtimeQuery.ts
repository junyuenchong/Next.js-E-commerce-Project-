"use client";

// Hooks for realtime query invalidation (SSE + polling fallback) and query integration.

import { useEffect } from "react";
import {
  QueryKey,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";

// Types for the realtime query hook options
type RealtimeQueryOptions<TQueryFnData> = Omit<
  UseQueryOptions<TQueryFnData>,
  "queryKey" | "queryFn"
> & {
  channels?: string | string[];
  /** Override SSE endpoint (e.g. admin events). */
  eventsUrl?: string;
  /** Polling fallback when SSE is unavailable (e.g. some hosts). */
  fallbackIntervalMs?: number;
  /**
   * When an SSE event arrives, invalidate queries whose keys match.
   * If omitted, only invalidates `queryKey`.
   */
  matchKey?: (queryKey: QueryKey) => boolean;
};

// Channel name normalization for internal convention
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

// Options for the realtime invalidation hook
type RealtimeInvalidateOptions = {
  /** Either provide `eventsUrl` OR provide `channels` (user endpoint). */
  eventsUrl?: string;
  channels?: string | string[];
  fallbackIntervalMs?: number;
  matchKey?: (queryKey: QueryKey) => boolean;
  /** Optional side-effect on each non-status event. */
  onEvent?: () => void;
};

// Returns URL for user SSE event subscriptions
function buildUserEventsUrl(channels: string[]) {
  return `/user/api/events?channels=${encodeURIComponent(channels.join(","))}`;
}

// Checks frame to see if it is a "status" kind
function isStatusFrame(
  data: unknown,
): data is { type?: string; realtime?: boolean } {
  if (!data || typeof data !== "object") return false;
  const t = (data as { type?: unknown }).type;
  return typeof t === "string" && t === "status";
}

// React hook: opens SSE events for data channel and triggers query invalidation
export function useRealtimeInvalidate(
  queryKey: QueryKey,
  options: RealtimeInvalidateOptions = {},
) {
  const {
    eventsUrl,
    channels,
    fallbackIntervalMs = 15000,
    matchKey,
    onEvent,
  } = options;
  const queryClient = useQueryClient();

  // Sets up SSE stream and fallbacks for realtime query invalidation
  useEffect(() => {
    const normalizedChannels = normalizeChannels(channels);
    const url =
      eventsUrl ??
      (normalizedChannels.length
        ? buildUserEventsUrl(normalizedChannels)
        : null);
    if (!url) return;

    // Invalidates based on match logic or just queryKey
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

    // Start fallback polling
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(invalidate, fallbackIntervalMs);
    };

    // Set/reset "no event" fallback timer
    const resetNoEventTimer = () => {
      if (noEventTimer) clearTimeout(noEventTimer);
      noEventTimer = setTimeout(startPolling, fallbackIntervalMs);
    };

    // Open SSE connection
    const es = new EventSource(url);
    resetNoEventTimer();

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as unknown;
        if (
          isStatusFrame(data) &&
          (data as { realtime?: boolean }).realtime === false
        ) {
          startPolling();
          return;
        }
        if (!isStatusFrame(data)) resetNoEventTimer();
      } catch {
        // ignore JSON parse errors; still treat as an invalidation signal
      }
      onEvent?.();
      invalidate();
    };

    es.onerror = () => startPolling();

    // Cleanup logic on hook disposal
    return () => {
      es.close();
      if (pollTimer) clearInterval(pollTimer);
      if (noEventTimer) clearTimeout(noEventTimer);
    };
  }, [
    channels,
    eventsUrl,
    fallbackIntervalMs,
    matchKey,
    onEvent,
    queryClient,
    queryKey,
  ]);
}

// Main hook: combines TanStack query with realtime invalidation support
export function useRealtimeQuery<TQueryFnData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options: RealtimeQueryOptions<TQueryFnData> = {},
) {
  const {
    channels,
    matchKey,
    eventsUrl,
    fallbackIntervalMs = 15000,
    ...queryOptions
  } = options;

  const query = useQuery({
    queryKey,
    queryFn,
    ...queryOptions,
  });

  // Attach SSE/poll invalidation to this query
  useRealtimeInvalidate(queryKey, {
    channels,
    eventsUrl,
    fallbackIntervalMs,
    matchKey,
  });

  return query;
}
