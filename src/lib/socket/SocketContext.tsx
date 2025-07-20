"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSocket } from './socket';
import type io from 'socket.io-client';

interface SocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  socket: ReturnType<typeof io> | null;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  socketError: string | null;
  reconnect: () => void;
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);

  const initializeSocket = useCallback(() => {
    setIsConnecting(true);
    let socketInstance: ReturnType<typeof io> | null = null;
    try {
      socketInstance = getSocket(true);
    } catch (err) {
      setSocketError((err as Error).message);
      setIsConnecting(false);
      return;
    }
    if (!socketInstance) {
      setIsConnecting(false);
      setSocketError('Socket instance could not be created.');
      return;
    }
    setSocket(socketInstance);

    // Check if already connected
    if (socketInstance.connected) {
      setIsConnected(true);
      setIsConnecting(false);
      setSocketError(null);
    } else {
      socketInstance.connect();
    }

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      setSocketError(null);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      setIsConnecting(false);
    });

    socketInstance.on('connect_error', (error: unknown) => {
      const err = error as { message?: string };
      setIsConnected(false);
      setIsConnecting(false);
      setSocketError(err.message || 'Connection failed');
    });

    socketInstance.on('joined', () => {
      // Room join event
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

  useEffect(() => {
    initializeSocket();
    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinRoom = (room: string) => {
    if (socket && isConnected) {
      (socket as { emit: (event: string, ...args: unknown[]) => void }).emit('join', room);
    }
  };

  const leaveRoom = (room: string) => {
    if (socket && isConnected) {
      socket.emit('leave', room);
    }
  };

  const reconnect = () => {
    initializeSocket();
  };

  const value: SocketContextType = {
    isConnected,
    isConnecting,
    socket,
    joinRoom,
    leaveRoom,
    socketError,
    reconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 