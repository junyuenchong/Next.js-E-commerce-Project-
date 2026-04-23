"use client";

/**
 * admin sse helpers
 * subscribe to admin sse and trigger cache refresh callbacks
 */

import { useRef } from "react";
import { useRealtimeInvalidate } from "@/app/lib/realtime";

type AdminSSEPath =
  | "/features/admin/api/events/products"
  | "/features/admin/api/events/categories"
  | "/features/admin/api/events/orders";

/**
 * admin sse hook
 * run onInvalidate when sse events arrive
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
