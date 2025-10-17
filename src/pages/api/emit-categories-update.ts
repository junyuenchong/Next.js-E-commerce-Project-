import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const io = ((res.socket as unknown) as { server: { io?: { emit: (event: string) => void } } }).server.io;
  if (io) {
    io.emit("categories_updated");
    res.status(200).json({ success: true });
  } else {
    res.status(500).json({ success: false, error: "Socket.IO server not initialized" });
  }
} 