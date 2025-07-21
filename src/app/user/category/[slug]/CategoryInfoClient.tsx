"use client";
import SalesCampaignBanner from '../../components/SalesCampaignBanner/SalesCampaignBanner';
import ProductList from '@/app/user/components/Products/ProductList/ProductList';
import { useRealtimeSWR } from '@/lib/hooks/useRealtimeSWR';

export default function CategoryInfoClient({ slug }: { slug: string }) {
  const { data: category } = useRealtimeSWR({
    url: `/user/api/categories/${slug}`,
    event: 'categories_updated',
    matchKey: (key) => typeof key === 'string' && key.includes('/categories'),
  });
  if (!category || typeof category !== 'object' || 'error' in category) return <div>Category not found</div>;
  const cat = category as { name: string };
  return (
    <div>
      <div className='bg-red-50 p-4'>
        <div className='container mx-auto'>
          <h1 className='text-2xl md:text-3xl font-bold text-center text-red-600 mb-2'>{cat.name} - UP TO 90% OFF! 🔥</h1>
          <p className='text-center text-red-500 text-sm md:text-base animate-pulse'>⚡️ Flash Sale Ending Soon! ⏰ Limited Time Only</p>
        </div>
      </div>
      <SalesCampaignBanner />
      <section className='container mx-auto py-8'>
        <ProductList categorySlug={slug} />
      </section>
    </div>
  );
} 