/** Admin: RBAC permission profiles. */
import RolePermissionsClient from "@/app/modules/admin/client/components/role-permissions/RolePermissionsClient";

export const metadata = {
  title: "Permission profiles · Admin",
};

export default function AdminRolePermissionsPage() {
  return <RolePermissionsClient />;
}
