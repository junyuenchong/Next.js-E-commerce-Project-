/** Admin: sensitive action log. */
import AdminAuditLogClient from "@/app/modules/admin/client/components/audit-log/AdminAuditLogClient";

export const metadata = { title: "Audit log · Admin" };

export default function AdminAuditLogPage() {
  return <AdminAuditLogClient />;
}
