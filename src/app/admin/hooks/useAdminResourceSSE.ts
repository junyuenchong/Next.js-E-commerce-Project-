"use client";

import { useEffect, useRef } from "react";

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

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(
        () => onInvalidateRef.current(),
        fallbackIntervalMs,
      );
    };

    const es = new EventSource(path);

    const onMessage = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(String(ev.data)) as {
          type?: string;
          realtime?: boolean;
        };
        if (data.type === "status") {
          if (data.realtime === false) startPolling();
          return;
        }
        onInvalidateRef.current();
      } catch {
        /* ignore non-JSON payloads */
      }
    };

    es.onmessage = onMessage;
    // Fallback for hosts where SSE is flaky/unavailable.
    es.onerror = () => startPolling();

    return () => {
      es.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [fallbackIntervalMs, path]);
}
