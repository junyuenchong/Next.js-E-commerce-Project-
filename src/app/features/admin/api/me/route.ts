/**
 * admin me api route
 * return admin identity and permission flags
 */

import { NextResponse } from "next/server";
import {
  adminJsonForbidden,
  adminJsonUnauthorized,
} from "@/backend/core/admin-api-guard";
import { permissionAppRoleFromUserRole } from "@/backend/core/auth/auth.service";
import { getAdminPermissionKeysForUser } from "@/backend/modules/access-control";
import { getCurrentAdminUser } from "@/backend/core/session";
import { jsonInternalServerError } from "@/backend/lib/api-error";

// Build `/api/me` response used by admin pages for permission checks.
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
    // Small helper to check a single permission key against the current list.
    const hasPermission = (p: string) =>
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
        userRead: hasPermission("user.read"),
        userUpdate: hasPermission("user.update"),
        userBan: hasPermission("user.ban"),
        orderRead: hasPermission("order.read"),
        orderUpdate: hasPermission("order.update"),
        orderRefund: hasPermission("order.refund"),
        productCreate: hasPermission("product.create"),
        productUpdate: hasPermission("product.update"),
        productDelete: hasPermission("product.delete"),
        couponRead: hasPermission("coupon.read"),
        couponManage: hasPermission("coupon.manage"),
        auditRead: hasPermission("audit.read"),
      } satisfies Record<string, boolean>,
    });
  } catch (error) {
    return jsonInternalServerError(error, "[admin/api/me GET]");
  }
}
