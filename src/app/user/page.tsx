"use client";

import { Suspense } from 'react';
import ProductList from '@/app/user/components/Products/ProductList/ProductList';
import React from 'react';
import SalesCampaignBanner from './components/SalesCampaignBanner/SalesCampaignBanner';
import Loading from './loading';
import { useSocketStatus } from '@/lib/socket/useSocketStatus';

const Home = () => {
  const socketStatus = useSocketStatus();
  return (
    <div>
      <div className="mb-2 text-sm text-gray-600 text-center">
        WebSocket status: <span style={{ color: socketStatus === 'connected' ? 'green' : socketStatus === 'error' ? 'red' : 'gray' }}>{socketStatus}</span>
      </div>
      <h2 className="text-2xl font-bold mb-4 mt-4 sm:mt-6 sm:mb-6 text-center">Products</h2>
      <SalesCampaignBanner />
      <Suspense fallback={<Loading />}>
        <ProductList />
      </Suspense>
    </div>
  );
};

export default Home;
