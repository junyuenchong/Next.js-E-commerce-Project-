/**
 * Re-exports realtime invalidate/query helpers from `app/lib` so admin code imports from one folder (`shared`).
 */
export {
  useRealtimeInvalidate,
  useRealtimeQuery,
} from "@/app/lib/query/useRealtimeQuery";
