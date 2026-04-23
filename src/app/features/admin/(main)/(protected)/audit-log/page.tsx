/**
 * admin audit log page
 * show sensitive action log
 */
import AdminAuditLogClient from "@/app/features/admin/components/client/audit-log/AdminAuditLogClient";

export const metadata = { title: "Audit log · Admin" };

export default function AdminAuditLogPage() {
  return <AdminAuditLogClient />;
}
