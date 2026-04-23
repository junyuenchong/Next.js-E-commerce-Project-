/**
 * route entry
 * redirect /features/admin to dashboard
 */
import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  redirect("/features/admin/dashboard");
}
