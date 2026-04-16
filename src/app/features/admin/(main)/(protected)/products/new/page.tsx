/** Admin: new product form. */
import ProductCreateClient from "@/app/features/admin/components/client/products/ProductCreateClient";

export const metadata = { title: "New product · Admin" };

export default function AdminProductNewPage() {
  return <ProductCreateClient />;
}
