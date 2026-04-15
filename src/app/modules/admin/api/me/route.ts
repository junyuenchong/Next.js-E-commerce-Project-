import { NextResponse } from "next/server";
import {
  adminJsonForbidden,
  adminJsonUnauthorized,
} from "@/backend/core/admin-api-guard";
import { permissionAppRoleFromUserRole } from "@/backend/core/auth/auth.service";
import { getAdminPermissionKeysForUser } from "@/backend/modules/access-control";
import { getCurrentAdminUser } from "@/backend/core/session";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export async function GET() {
  try {
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
  } catch (error) {
    return jsonInternalServerError(error, "[admin/api/me GET]");
  }
}
