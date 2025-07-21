

import React from 'react';
import CategoryInfoClient from './CategoryInfoClient';

const CategoryPage = async ({ params }: { params?: Promise<{ slug?: string }> }) => {
  const resolvedParams = params ? await params : {};
  const slug = resolvedParams.slug;
  if (!slug) {
    return <div>Category not found</div>;
  }
  return <CategoryInfoClient slug={slug} />;
};

export default CategoryPage;