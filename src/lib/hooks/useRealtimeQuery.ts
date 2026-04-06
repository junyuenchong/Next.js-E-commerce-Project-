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
  const { channels, matchKey, ...queryOptions } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn,
    ...queryOptions,
  });

  useEffect(() => {
    const normalized = normalizeChannels(channels);
    if (!normalized.length) return;

    const es = new EventSource(
      `/user/api/events?channels=${encodeURIComponent(normalized.join(","))}`,
    );

    es.onmessage = () => {
      if (matchKey) {
        queryClient.invalidateQueries({
          predicate: (q) => matchKey(q.queryKey),
        });
      } else {
        queryClient.invalidateQueries({ queryKey });
      }
    };

    return () => es.close();
  }, [channels, matchKey, queryClient, queryKey]);

  return query;
}
