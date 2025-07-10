import { getAllProducts, searchProducts } from "@/actions/product";
import { getAllCategories } from "@/actions/category";
import ProductForm from "../components/products/ProductForm";
import ProductList from "../components/products/ProductList";

// Prevent prerendering since this page requires database access
export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

// Define types for Product and Category
import type { Category } from "@prisma/client";
import type { Product } from "@prisma/client";

export default async function ProductsPage(
  props: ProductsPageProps
) {
  const searchParams = await props.searchParams;
  const queryParam = searchParams?.q;
  const searchQuery = typeof queryParam === "string" ? queryParam.trim() : "";

  let products: Product[] = [];
  let categories: Category[] = [];

  try {
    const [productsResult, categoriesResult] = await Promise.all([
      searchQuery ? searchProducts(searchQuery) : getAllProducts(),
      getAllCategories(),
    ]);
    
    products = productsResult || [];
    categories = categoriesResult || [];
  } catch (error) {
    console.error("Failed to fetch data:", error);
    // During prerendering, if database is not available, use empty arrays
    products = [];
    categories = [];
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-gray-800">Product Management</h1>
      <ProductForm categories={categories} />
      <ProductList
        products={products}
        categories={categories}
        initialSearch={searchQuery}
      />
    </main>
  );
}
