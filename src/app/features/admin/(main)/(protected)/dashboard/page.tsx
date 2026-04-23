/**
 * admin dashboard page
 * show overview and quick links
 */
import AdminDashboardClient from "@/app/features/admin/components/client/dashboard/AdminDashboardClient";

export const metadata = { title: "Dashboard · Admin" };

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
