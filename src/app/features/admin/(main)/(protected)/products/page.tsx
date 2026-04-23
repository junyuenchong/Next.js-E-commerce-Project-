/**
 * admin products page
 * show product list
 */
import AdminProductsClient from "@/app/features/admin/components/client/products/AdminProductsClient";

export const metadata = { title: "Products · Admin" };

export default function AdminProductsPage() {
  return <AdminProductsClient />;
}
