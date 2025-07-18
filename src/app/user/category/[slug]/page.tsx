

import { Suspense } from 'react';
import { getCategoryBySlug, getProductsByCategorySlug } from '@/actions/category';
import React from 'react';
import SalesCampaignBanner from '../../components/SalesCampaignBanner/SalesCampaignBanner';
import ProductList from '@/app/user/components/Products/ProductList/ProductList';
import Loading from '../../loading';
    
// Async component for category content with data
async function CategoryContentWithData({ slug }: { slug: string }) {
    // Fetch category and initial products in parallel
    const [category, initialProducts] = await Promise.all([
        getCategoryBySlug(slug),
        getProductsByCategorySlug(slug, 6, 1) // Reduced initial load for better LCP
    ]);

    // Debug log
    console.log('CategoryContentWithData:', { slug, category, initialProducts });

    return (
    <>
      {/* Debug Panel */}
      <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', color: '#ad8b00', padding: '12px', margin: '16px 0', borderRadius: '8px', fontSize: '14px' }}>
        <strong>Debug Info:</strong><br />
        <div>Category: <b>{category.name}</b> (id: {category.id}, slug: {category.slug})</div>
        <div>Products in this category:</div>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {initialProducts.length === 0 ? (
            <li><i>No products found for this category.</i></li>
          ) : (
            initialProducts.map((p: unknown) => {
              const product = p as { id: number; title: string; categoryId: number };
              return (
                <li key={product.id}>
                  <b>{product.title}</b> (id: {product.id}, categoryId: {product.categoryId})
              </li>
              );
            })
          )}
        </ul>
      </div>
            <div className='bg-red-50 p-4'>
                <div className='container mx-auto'>
                    <h1 className='text-2xl md:text-3xl font-bold text-center text-red-600 mb-2'>{category.name} - UP TO 90% OFF! 🔥</h1>
                    <p className='text-center text-red-500 text-sm md:text-base animate-pulse'>⚡️ Flash Sale Ending Soon! ⏰ Limited Time Only</p>
                </div>
            </div>
            <div className='bg-yellow-50 py-3'>
                <div className='container mx-auto'>
                    <div className='flex items-center justify-center gap-4 text-sm'>
                        <div className='flex items-center gap-2'>
                            <span className='text-yellow-600'>🚚</span>
                            <span>Free Shipping</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <span className='text-yellow-600'>⭐️</span>
                            <span>Top Rated</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <span className='text-yellow-600'>💰</span>
                            <span>Best Prices</span>
                        </div>
                    </div>
                </div>
            </div>
            <section className='container mx-auto py-8'>
                <div className='text-center mb-8'>
                    <p className='text-sm text-gray-500'>🎉 {initialProducts.length} Amazing Deals Available Now!</p>
                </div>
                <ProductList 
                    categorySlug={slug} 
                />
            </section>
    </>
  );
}

const CategoryPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  
  return (
    <div>
      <SalesCampaignBanner />
      <Suspense fallback={<Loading />}>
        <CategoryContentWithData slug={slug} />
      </Suspense>
        </div>
    );
};

export default CategoryPage;