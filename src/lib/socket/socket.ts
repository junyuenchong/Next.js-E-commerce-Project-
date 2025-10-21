import io from "socket.io-client";

let socket: ReturnType<typeof io> | null = null;
let isInitializing = false;

// Get the correct Socket.IO base URL for the current environment
const getSocketUrl = () => {
  if (typeof window === 'undefined') return undefined;
  if (process.env.NODE_ENV === 'production') {
    // Use current origin in production (works for Render)
    const url = window.location.origin;
    return url;
  }
  // In development, use current origin (Next dev server on :3000)
  return window.location.origin;
};

// Resolve Socket.IO server path per environment
const getSocketPath = () => (process.env.NODE_ENV === 'production' ? '/socket' : '/api/socket');

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
  if (!url) {
    isInitializing = false;
    throw new Error('[Socket] WebSocket URL is not defined.');
  }

  socket = io(url, {
    path: getSocketPath(),
    autoConnect: false,
    transports: ["websocket", "polling"],
    timeout: 45000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    upgrade: true,
    rememberUpgrade: false,
    forceNew: true,
  });

  // Add debugging event listeners
  socket.on('connect', () => {
    console.log('✅ Socket.IO connected successfully');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ Socket.IO reconnection error:', error);
  });

  // Ensure the API socket route is initialized in development
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Fire-and-forget to prime the Next API socket handler
      void fetch('/api/socket');
    } catch {
      // ignore
    }
  }

  console.log('✅ Socket.IO client configuration:', {
    url,
    path: getSocketPath(),
    transports: ["websocket"],
    timeout: 45000,
    reconnection: true,
    reconnectionAttempts: 5,
    forceNew: true,
  });

  isInitializing = false;
  return socket;
}
