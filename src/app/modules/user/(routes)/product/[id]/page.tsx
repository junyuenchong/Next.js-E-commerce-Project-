/** Product PDP + SEO metadata. */
import type { Metadata } from "next";
import ProductDetailClient from "@/app/modules/user/client/components/Products/ProductList/ProductDetailClient";
import type { ProductDetailPayload } from "@/app/modules/user/types";
import { getProductById } from "@/backend/modules/product";
import { serializeProductCardForClient } from "@/app/lib/serialize-product-card";
import { getSiteUrl } from "@/app/lib/site-url";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params?: Promise<{ id?: string }>;
  searchParams?: Promise<{ query?: string }>;
}): Promise<Metadata> {
  const resolvedParams = params ? await params : {};
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const productId = resolvedParams.id ?? resolvedSearchParams.query;
  if (!productId) return { title: "Product" };

  try {
    const product = (await getProductById(productId)) as ProductDetailPayload;
    if (!product || product.price == null)
      return { title: "Product not found" };

    const title = product.title;
    const description =
      typeof product.description === "string" && product.description.length > 0
        ? product.description.slice(0, 160)
        : `Buy ${product.title} at CJY E-Commerce.`;
    const site = getSiteUrl();
    const url = `${site}/modules/user/product/${product.id}`;

    return {
      title,
      description,
      alternates: { canonical: `/modules/user/product/${product.id}` },
      openGraph: {
        title,
        description,
        url,
        type: "website",
        images: product.imageUrl
          ? [{ url: product.imageUrl, alt: product.title }]
          : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: product.imageUrl ? [product.imageUrl] : [],
      },
    };
  } catch (error: unknown) {
    console.error("[product page] metadata load failed", error);
    return { title: "Product not found" };
  }
}

const ProductPage = async ({
  params,
  searchParams,
}: {
  params?: Promise<{ id?: string }>;
  searchParams?: Promise<{ query?: string }>;
}) => {
  const resolvedParams = params ? await params : {};
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const productId = resolvedParams.id ?? resolvedSearchParams.query;
  if (!productId) {
    return <div>Product not found</div>;
  }

  let product: ProductDetailPayload | null = null;
  try {
    product = (await getProductById(productId)) as ProductDetailPayload;
  } catch (error: unknown) {
    console.error("[product page] product load failed", error);
    return <div>Product not found</div>;
  }

  if (!product || !product.price) {
    return <div>Product not found</div>;
  }

  return (
    <ProductDetailClient
      productId={productId}
      initialProduct={serializeProductCardForClient(product)}
    />
  );
};

export default ProductPage;
