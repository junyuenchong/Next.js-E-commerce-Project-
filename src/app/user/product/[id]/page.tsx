
import ProductDetailClient from '@/app/user/components/Products/ProductList/ProductDetailClient';
import { getProductById } from '@/actions/product';

const ProductPage = async ({ params, searchParams }: { params?: Promise<{ id?: string }>, searchParams?: Promise<{ query?: string }> }) => {
  const resolvedParams = params ? await params : {};
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const productId = resolvedParams.id ?? resolvedSearchParams.query;
  if (!productId) {
    return <div>Product not found</div>;
  }

  let product = null;
  try {
    product = await getProductById(productId);
  } catch {
    return <div>Product not found</div>;
  }

  if (!product || !product.price) {
    return <div>Product not found</div>;
  }

  return <ProductDetailClient productId={productId} initialProduct={product} />;
};

export default ProductPage;
