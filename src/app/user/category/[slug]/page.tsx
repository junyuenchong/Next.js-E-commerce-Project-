

import { Suspense } from 'react';
import React from 'react';
import SalesCampaignBanner from '../../components/SalesCampaignBanner/SalesCampaignBanner';
import ProductList from '@/app/user/components/Products/ProductList/ProductList';
import Loading from '../../loading';
import { useRealtimeSWR } from '@/lib/hooks/useRealtimeSWR';

function CategoryInfoClient({ slug }: { slug: string }) {
  const { data: category } = useRealtimeSWR({
    url: `/user/api/categories/${slug}`,
    event: 'categories_updated',
    matchKey: (key) => typeof key === 'string' && key.includes('/categories'),
  });
  if (!category || typeof category !== 'object' || !('name' in category)) return <div>Loading category...</div>;
  const cat = category as { name: string };
  return (
    <div className='bg-red-50 p-4'>
      <div className='container mx-auto'>
        <h1 className='text-2xl md:text-3xl font-bold text-center text-red-600 mb-2'>{cat.name} - UP TO 90% OFF! 🔥</h1>
        <p className='text-center text-red-500 text-sm md:text-base animate-pulse'>⚡️ Flash Sale Ending Soon! ⏰ Limited Time Only</p>
      </div>
    </div>
  );
}

const CategoryPage = ({ params }: { params?: { slug?: string } }) => {
  const slug = params?.slug;
  if (!slug) {
    return <div>Category not found</div>;
  }
  return (
    <div>
      <SalesCampaignBanner />
      <CategoryInfoClient slug={slug} />
      <section className='container mx-auto py-8'>
        <ProductList categorySlug={slug} />
      </section>
    </div>
  );
};

export default CategoryPage;