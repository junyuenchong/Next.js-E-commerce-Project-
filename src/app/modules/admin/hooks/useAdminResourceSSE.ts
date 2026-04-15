"use client";

import { useRef } from "react";
import { useRealtimeInvalidate } from "@/app/lib/query/useRealtimeQuery";

type AdminSSEPath =
  | "/modules/admin/api/events/products"
  | "/modules/admin/api/events/categories"
  | "/modules/admin/api/events/orders";

/** Subscribes to admin SSE and runs `onInvalidate` when events arrive. */
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
