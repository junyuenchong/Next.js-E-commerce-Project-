import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket/socket";

export function useSocketStatus() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "connecting" | "error">("connecting");

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => setStatus("connected");
    const handleDisconnect = () => setStatus("disconnected");
    const handleError = () => setStatus("error");

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleError);

    // Try to connect if not already
    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleError);
    };
  }, []);

  return status;
} 