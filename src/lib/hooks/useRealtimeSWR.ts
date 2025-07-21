"use client";
import useSWR, { mutate as globalMutate, SWRConfiguration } from "swr";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket/socket";

type UseRealtimeSWRProps = {
  url: string;
  event: string;
  matchKey?: (key: string) => boolean;
  swrOptions?: SWRConfiguration;
};

export function useRealtimeSWR<T>({
  url,
  event,
  matchKey,
  swrOptions = {},
}: UseRealtimeSWRProps) {
  const { data, mutate, ...rest } = useSWR<T>(url, (u) => fetch(u).then(r => r.json()), swrOptions);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    if (socket.connected) socket.emit("join", event.replace("_updated", ""));
    else socket.on("connect", () => socket.emit("join", event.replace("_updated", "")));

    const handler = () => {
      mutate();
      if (matchKey) {
        globalMutate(matchKey);
      }
    };
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [mutate, event, matchKey]);

  return { data, mutate, ...rest };
} 