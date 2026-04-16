// Feature: user hook entrypoint forwards realtime query helpers.
// Guard: import from `app/lib` to avoid deleted `app/utils/query` compatibility path.
export {
  useRealtimeInvalidate,
  useRealtimeQuery,
} from "@/app/lib/query/useRealtimeQuery";
