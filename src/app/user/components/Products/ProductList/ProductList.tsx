"use client";

import { useEffect } from 'react';
import useSWR from 'swr';
import { getSocket } from '@/lib/socket/socket';
import ProductGrid from '../ProductGrid/ProductGrid';

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(res => res.json());

export default function ProductList() {
  const { data: products, mutate } = useSWR('/user/api/products', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 0,
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    if (socket.connected) socket.emit('join', 'products');
    else socket.on('connect', () => socket.emit('join', 'products'));

    const handleProductsUpdate = () => {
      console.log('[DEBUG] Received products_updated event, mutating SWR');
      mutate();
    };
    socket.on('products_updated', handleProductsUpdate);
    return () => {
      socket.off('products_updated', handleProductsUpdate);
    };
  }, [mutate]);

  useEffect(() => {
    console.log('[DEBUG] Rendered ProductList with products:', products);
  }, [products]);

  if (!products) return <div>Loading...</div>;
  return <ProductGrid products={products} />;
}
