import io from "socket.io-client";

let socket: ReturnType<typeof io> | null = null;
let isInitializing = false;

// Use environment variable for Railway domain in production
const getSocketUrl = () => {
  if (typeof window === 'undefined') return undefined;
  if (process.env.NODE_ENV === 'production') {
    // Ensure protocol is included for Railway URL
    let url = process.env.NEXT_PUBLIC_RAILWAY_URL;
    if (url) {
      if (!/^https?:\/\//.test(url)) {
        url = `https://${url}`;
      }
      return url;
    }
    return window.location.origin;
  }
  return 'http://localhost:3000';
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
    path: "/api/socket",
    autoConnect: false,
    transports: ["polling", "websocket"],
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
    path: "/api/socket",
    transports: ["polling", "websocket"],
    timeout: 45000,
    reconnection: true,
    reconnectionAttempts: 5,
    forceNew: true,
  });

  isInitializing = false;
  return socket;
}
