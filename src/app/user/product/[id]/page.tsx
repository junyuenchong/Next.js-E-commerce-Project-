
import ProductDetailClient from '@/app/user/components/Products/ProductList/ProductDetailClient';
import { getProductById } from '@/actions/product';

const ProductPage = async ({ params, searchParams }: { params?: { id?: string }, searchParams?: { query?: string } }) => {
  const productId = params?.id ?? searchParams?.query;
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
