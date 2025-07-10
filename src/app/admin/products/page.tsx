import { getAllProducts, searchProducts } from "@/actions/product";
import { getAllCategories } from "@/actions/category";
import ProductForm from "../components/products/ProductForm";
import ProductList from "../components/products/ProductList";


export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: { q?: string }; // ✅ Correct type
}) {
  const searchQuery = searchParams?.q ?? ""; // ✅ Safe access

  const products = searchQuery
    ? await searchProducts(searchQuery)
    : await getAllProducts();

  const categories = await getAllCategories();

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
