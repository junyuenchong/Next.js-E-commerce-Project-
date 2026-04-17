/**
 * Sidebar navigation model and permission-based filtering rules.
 */

import type { AdminMe } from "@/app/features/admin/types";

export type AdminNavNeed =
  | "dashboard"
  | "analytics"
  | "orderRead"
  | "catalog"
  | "userRead"
  | "coupons"
  | "auditRead";

export type AdminNavLink = {
  href: string;
  label: string;
  need: AdminNavNeed;
};

export const ADMIN_NAV_LINKS: readonly AdminNavLink[] = [
  { href: "/features/admin/dashboard", label: "Dashboard", need: "dashboard" },
  { href: "/features/admin/analytics", label: "Analytics", need: "analytics" },
  { href: "/features/admin/orders", label: "Orders", need: "orderRead" },
  { href: "/features/admin/products", label: "Products", need: "catalog" },
  { href: "/features/admin/categories", label: "Categories", need: "catalog" },
  { href: "/features/admin/reviews", label: "Reviews", need: "catalog" },
  { href: "/features/admin/users", label: "Users", need: "userRead" },
  {
    href: "/features/admin/role-permissions",
    label: "Permission profiles",
    need: "userRead",
  },
  { href: "/features/admin/coupons", label: "Coupons", need: "coupons" },
  {
    href: "/features/admin/support/chats",
    label: "Support chats",
    need: "orderRead",
  },
  { href: "/features/admin/audit-log", label: "Audit log", need: "auditRead" },
] as const;

// Match current pathname to nav item (supports nested routes).
export function adminNavLinkIsActive(pathname: string, href: string) {
  if (href === "/features/admin/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Catalog section is visible if any catalog permission is granted.
function canSeeCatalog(can: AdminMe["can"]) {
  return Boolean(can.productCreate || can.productUpdate || can.productDelete);
}

// Filter nav links using current admin capability flags.
export function filterAdminNavLinks(
  links: readonly AdminNavLink[],
  me: AdminMe | undefined,
) {
  if (!me?.can) {
    // Safe default: hide super-admin links until role is loaded.
    return links.filter(
      (link) => link.href !== "/features/admin/role-permissions",
    );
  }

  const isSuper = String(me.role ?? "") === "SUPER_ADMIN";

  return links.filter((link) => {
    if (link.href === "/features/admin/role-permissions" && !isSuper) {
      return false;
    }

    switch (link.need) {
      case "dashboard":
        return me.can.orderRead || me.can.userRead || canSeeCatalog(me.can);
      case "analytics":
        return me.can.orderRead;
      case "orderRead":
        return me.can.orderRead;
      case "userRead":
        return me.can.userRead;
      case "catalog":
        return canSeeCatalog(me.can);
      case "coupons":
        return Boolean(me.can.couponRead || me.can.couponManage);
      case "auditRead":
        return Boolean(me.can.auditRead);
      default:
        return true;
    }
  });
}
