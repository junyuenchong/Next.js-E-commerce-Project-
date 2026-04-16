/** Admin: single order detail. */
import AdminOrderDetailClient from "@/app/features/admin/components/client/orders/AdminOrderDetailClient";

export const metadata = { title: "Order · Admin" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number.parseInt(id, 10);
  if (!Number.isFinite(orderId) || orderId < 1) {
    return <p className="text-sm text-red-600">Invalid order id.</p>;
  }
  return <AdminOrderDetailClient orderId={orderId} />;
}
