"use client";

import { useRef } from "react";
import { useRealtimeInvalidate } from "@/lib/hooks/useRealtimeQuery";

// Admin realtime wrapper: subscribes to admin event streams and triggers refresh callbacks.
type AdminSSEPath =
  | "/admin/api/events/products"
  | "/admin/api/events/categories";

/**
 * Subscribes to admin SSE; calls `onInvalidate` when another tab/instance mutates data (Redis pub/sub).
 * No-op for malformed payloads; ignores initial `status` frames.
 */
export function useAdminResourceSSE(
  path: AdminSSEPath,
  onInvalidate: () => void,
  fallbackIntervalMs: number = 15000,
) {
  const onInvalidateRef = useRef(onInvalidate);
  onInvalidateRef.current = onInvalidate;

  useRealtimeInvalidate(["__admin-sse__"], {
    eventsUrl: path,
    fallbackIntervalMs,
    matchKey: () => false,
    onEvent: () => onInvalidateRef.current(),
  });
}
