"use client";

import useSWRInfinite from 'swr/infinite';
import { useEffect } from 'react';
import { useSocket } from '@/lib/socket/SocketContext';
import ProductGrid from '../ProductGrid/ProductGrid';
import { Product } from '@prisma/client';

const PAGE_SIZE = 10;

const fetcher = (url: string) => fetch(url).then(res => res.json());

type ProductListProps = {
  categorySlug?: string;
};

const ProductList = ({ categorySlug }: ProductListProps) => {
  const { isConnected, socket } = useSocket();

  const getKey = (pageIndex: number, previousPageData: Product[] | null) => {
    if (previousPageData && previousPageData.length === 0) return null; // reached the end
    const page = pageIndex + 1;
    return categorySlug
      ? `/user/api/products?category=${encodeURIComponent(categorySlug)}&limit=${PAGE_SIZE}&page=${page}`
      : `/user/api/products?limit=${PAGE_SIZE}&page=${page}`;
  };

  const {
    data,
    error,
    size,
    setSize,
    isValidating
  } = useSWRInfinite(getKey, fetcher);

  const allProducts: Product[] = data ? ([] as Product[]).concat(...data) : [];
  const isLoading = !data && !error;
  const isEnd = data && data[data.length - 1]?.length < PAGE_SIZE;

  useEffect(() => {
    if (!socket) return;
    const handleProductsUpdate = () => {
      setSize(1); // refetch first page
    };
    socket.on('products_updated', handleProductsUpdate);
    return () => {
      socket.off('products_updated', handleProductsUpdate);
      return;
    };
  }, [socket, setSize]);

  useEffect(() => {
    if (!socket || !isConnected) return;
    socket.emit('join', 'products');
    return () => {
      socket.emit('leave', 'products');
    };
  }, [socket, isConnected]);

  const handleLoadMore = () => {
    setSize(size + 1);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading products.</div>;

  return (
    <>
      <ProductGrid products={allProducts} />
      {!isEnd && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={isValidating}
          >
            {isValidating ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </>
  );
};

export default ProductList;
