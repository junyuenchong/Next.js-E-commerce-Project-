import io from "socket.io-client";

let socket: ReturnType<typeof io> | null = null;
let isInitializing = false;

// Use environment variable for Railway domain in production
const getSocketUrl = () => {
  if (typeof window === 'undefined') return undefined;
  if (process.env.NODE_ENV === 'production') {
    let url = process.env.NEXT_PUBLIC_RAILWAY_URL;
    if (url) {
      // Always use wss:// for production
      if (!/^wss?:\/\//.test(url)) {
        url = `wss://${url}`;
      }
      return url;
    }
    return window.location.origin.replace(/^http/, 'ws');
  }
  return 'ws://localhost:3000';
};

export function getSocket(forceNew = false) {
  if (socket && !forceNew) {
    console.log('🔄 Reusing existing Socket.IO client instance');
    return socket;
  }

  if (isInitializing) {
    console.log('⏳ Socket.IO client is already being initialized...');
    return socket;
  }

  isInitializing = true;
  console.log('🔧 Creating new Socket.IO client instance...');

  // If forcing new, disconnect the old one
  if (socket && forceNew) {
    socket.disconnect();
    socket = null;
  }

  const url = getSocketUrl();
  socket = io(url, {
    path: "/socket",
    autoConnect: false,
    transports: ["websocket"],
    timeout: 45000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    upgrade: true,
    rememberUpgrade: true,
  });

  console.log('✅ Socket.IO client configuration:', {
    url,
    path: "/socket",
    transports: ["websocket"],
    timeout: 45000,
    reconnection: true,
    reconnectionAttempts: 5,
    forceNew: true,
  });

  isInitializing = false;
  return socket;
}
