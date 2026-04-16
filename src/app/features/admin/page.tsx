/** `/features/admin` → dashboard (shell lives under `(main)`). */
import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  redirect("/features/admin/dashboard");
}
