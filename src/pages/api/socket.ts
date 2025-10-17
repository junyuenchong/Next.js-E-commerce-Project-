import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";

export const config = {
  api: {
    bodyParser: false,
  },
};

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: Server;
    };
  };
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Defensive: ensure res.socket exists
  if (!res.socket) {
    res.status(400).end("No socket found on response object.");
    return;
  }

  const resWithSocket = res as NextApiResponseWithSocket;
  const server = resWithSocket.socket.server;
  if (!server.io) {
    const io = new Server(server, {
      path: "/api/socket",
      addTrailingSlash: false,
    });
    server.io = io;

    io.on("connection", (socket) => {
      console.log("✅ New client connected: " + socket.id);
      // Support room subscriptions used by clients (e.g., 'products', 'categories')
      socket.on("join", (room: string) => {
        try {
          socket.join(room);
          socket.emit("joined", room);
        } catch {
          // ignore
        }
      });
      socket.on("leave", (room: string) => {
        try {
          socket.leave(room);
        } catch {
          // ignore
        }
      });
      socket.on("disconnect", (reason) => {
        if (reason && !["client namespace disconnect", "transport close", "transport error"].includes(reason)) {
          console.warn("❌ Client disconnected: " + socket.id + " Reason: " + reason);
        }
      });
    });
  }
  res.end();
} 