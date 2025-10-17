import useSWR from 'swr';
import { useEffect } from 'react';
import { useSocket } from '@/lib/socket/SocketContext';
import { Product } from '@prisma/client';

export function useRealtimeProducts(fetchUrl: string, initialProducts: Product[]) {
  const { socket, isConnected } = useSocket();
  const { data, mutate, isValidating } = useSWR(fetchUrl, {
    fallbackData: initialProducts,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    if (!socket || !isConnected) return;
    socket.emit('join', 'products');
    const handleUpdate = () => {
      console.log('🟢 [Realtime] products_updated event received, mutating SWR...');
      mutate();
    };
    socket.on('products_updated', handleUpdate);
    return () => {
      socket.off('products_updated', handleUpdate);
    };
  }, [socket, isConnected, mutate]);

  return { data, mutate, isValidating };
} 