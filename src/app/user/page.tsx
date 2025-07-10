

import ProductList from '@/app/user/components/ProductList/ProductList';
import React from 'react';
import SalesCampaignBanner from './components/SalesCampaignBanner/SalesCampaignBanner';


const Home = async () => {

  return (
    <div>
      {/* {JSON.stringify(user)}
      {JSON.stringify(categories)}
      {JSON.stringify(products)} */}
     
      <h2 className="text-2xl font-bold mb-4 text-center ">Products</h2>
      <SalesCampaignBanner/>
        <ProductList/>
    </div>
  );
};

export default Home;
