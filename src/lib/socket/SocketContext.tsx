"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSocket } from './socket';
import type io from 'socket.io-client';

interface SocketContextType {
  isConnected: boolean;
  socket: ReturnType<typeof io> | null;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  socketError: string | null;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const socketInstance = getSocket();
    if (!socketInstance) {
      console.error('❌ Failed to get socket instance');
      return;
    }
    
    setSocket(socketInstance);

    // Check if already connected
    if (socketInstance.connected) {
      console.log('✅ Socket already connected');
      setIsConnected(true);
      setSocketError(null);
    } else {
      // Connect to WebSocket
      console.log('🔌 Connecting to WebSocket...');
      socketInstance.connect();
    }

    // Listen for connection
    socketInstance.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setIsConnected(true);
      setSocketError(null);
    });

    // Listen for disconnection
    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
      setIsConnected(false);
    });

    // Listen for connection errors
    socketInstance.on('connect_error', (error: unknown) => {
      const err = error as { message?: string };
      console.error('❌ WebSocket connection error:', error);
      setIsConnected(false);
      setSocketError(err.message || 'Connection failed');
    });

    // Listen for successful room join
    socketInstance.on('joined', (room: string) => {
      console.log('✅ Joined room:', room);
    });

    return () => {
      if (socketInstance) {
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('connect_error');
        socketInstance.off('joined');
        socketInstance.disconnect();
      }
    };
  }, []);

  const joinRoom = (room: string) => {
    if (socket && isConnected) {
      (socket as { emit: (event: string, ...args: unknown[]) => void }).emit('join', room);
      console.log(`🎯 Joining room: ${room}`);
    }
  };

  const leaveRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('leave', room);
      console.log(`🚪 Leaving room: ${room}`);
    }
  };

  const value: SocketContextType = {
    isConnected,
    socket,
    joinRoom,
    leaveRoom,
    socketError,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 