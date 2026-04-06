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
) {
  const onInvalidateRef = useRef(onInvalidate);
  onInvalidateRef.current = onInvalidate;

  useEffect(() => {
    const es = new EventSource(path);

    const onMessage = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(String(ev.data)) as { type?: string };
        if (data.type === "status") return;
        onInvalidateRef.current();
      } catch {
        /* ignore non-JSON payloads */
      }
    };

    es.onmessage = onMessage;
    return () => {
      es.close();
    };
  }, [path]);
}
