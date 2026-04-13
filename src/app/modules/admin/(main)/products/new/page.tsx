/** Admin: new product form. */
import ProductCreateClient from "@/app/modules/admin/client/components/products/ProductCreateClient";

export const metadata = { title: "New product · Admin" };

export default function AdminProductNewPage() {
  return <ProductCreateClient />;
}
