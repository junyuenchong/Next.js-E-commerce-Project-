/** Admin: RBAC permission profiles. */
import RolePermissionsClient from "@/app/modules/admin/components/client/role-permissions/RolePermissionsClient";

export const metadata = {
  title: "Permission profiles · Admin",
};

export default function AdminRolePermissionsPage() {
  return <RolePermissionsClient />;
}
