

import { Suspense } from 'react';
import React from 'react';
import SalesCampaignBanner from '../../components/SalesCampaignBanner/SalesCampaignBanner';
import ProductList from '@/app/user/components/Products/ProductList/ProductList';
import Loading from '../../loading';
import CategoryInfoClient from './CategoryInfoClient';

const CategoryPage = ({ params }: { params?: { slug?: string } }) => {
  const slug = params?.slug;
  if (!slug) {
    return <div>Category not found</div>;
  }
  return <CategoryInfoClient slug={slug} />;
};

export default CategoryPage;