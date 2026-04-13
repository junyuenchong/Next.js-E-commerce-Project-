import { NextResponse } from "next/server";
import {
  adminJsonForbidden,
  adminJsonUnauthorized,
} from "@/backend/lib/admin-api-guard";
import { permissionAppRoleFromUserRole } from "@/backend/lib/auth";
import { getAdminPermissionKeysForUser } from "@/backend/lib/permission-resolver";
import { getCurrentAdminUser } from "@/backend/lib/session";

export async function GET() {
  const user = await getCurrentAdminUser();
  if (!user) {
    return adminJsonUnauthorized();
  }

  const appRole = permissionAppRoleFromUserRole(user.role);
  if (!appRole) {
    return adminJsonForbidden(
      "You don't have access to the admin panel with this account.",
    );
  }

  const permissions = await getAdminPermissionKeysForUser(user);
  const has = (p: string) =>
    permissions.includes("*") || permissions.includes(p);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    appRole,
    adminPermissionRoleId: user.adminPermissionRoleId,
    permissions,
    can: {
      userRead: has("user.read"),
      userUpdate: has("user.update"),
      userBan: has("user.ban"),
      orderRead: has("order.read"),
      orderUpdate: has("order.update"),
      orderRefund: has("order.refund"),
      productCreate: has("product.create"),
      productUpdate: has("product.update"),
      productDelete: has("product.delete"),
      couponRead: has("coupon.read"),
      couponManage: has("coupon.manage"),
      roleProfileDelete: has("role.profile.delete"),
      auditRead: has("audit.read"),
    } satisfies Record<string, boolean>,
  });
}
