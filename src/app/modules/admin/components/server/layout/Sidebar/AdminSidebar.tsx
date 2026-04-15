"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import http from "@/app/utils/http";
import type { AdminMe } from "@/app/modules/admin/types";

function catalogNav(can: AdminMe["can"]) {
  return Boolean(can.productCreate || can.productUpdate || can.productDelete);
}

async function fetchAdminMe(): Promise<AdminMe> {
  const { data } = await http.get<AdminMe>("/modules/admin/api/me");
  return data;
}

const allLinks = [
  {
    href: "/modules/admin/dashboard",
    label: "Dashboard",
    need: "dashboard" as const,
  },
  {
    href: "/modules/admin/analytics",
    label: "Analytics",
    need: "analytics" as const,
  },
  {
    href: "/modules/admin/orders",
    label: "Orders",
    need: "orderRead" as const,
  },
  {
    href: "/modules/admin/products",
    label: "Products",
    need: "catalog" as const,
  },
  {
    href: "/modules/admin/categories",
    label: "Categories",
    need: "catalog" as const,
  },
  {
    href: "/modules/admin/reviews",
    label: "Reviews",
    need: "catalog" as const,
  },
  { href: "/modules/admin/users", label: "Users", need: "userRead" as const },
  {
    href: "/modules/admin/role-permissions",
    label: "Permission profiles",
    need: "userRead" as const,
  },
  {
    href: "/modules/admin/coupons",
    label: "Coupons",
    need: "coupons" as const,
  },
  {
    href: "/modules/admin/audit-log",
    label: "Audit log",
    need: "auditRead" as const,
  },
];

function navLinkIsActive(pathname: string, href: string) {
  if (href === "/modules/admin/dashboard") {
    return pathname === href;
  }
  if (
    href === "/modules/admin/categories" ||
    href === "/modules/admin/products" ||
    href === "/modules/admin/orders" ||
    href === "/modules/admin/users" ||
    href === "/modules/admin/role-permissions" ||
    href === "/modules/admin/analytics" ||
    href === "/modules/admin/reviews" ||
    href === "/modules/admin/coupons" ||
    href === "/modules/admin/audit-log"
  ) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchAdminMe,
    staleTime: 60_000,
  });

  const links = allLinks.filter((link) => {
    if (!me?.can) return true;
    switch (link.need) {
      case "dashboard":
        return me.can.orderRead || me.can.userRead || catalogNav(me.can);
      case "analytics":
        return me.can.orderRead;
      case "orderRead":
        return me.can.orderRead;
      case "userRead":
        return me.can.userRead;
      case "catalog":
        return catalogNav(me.can);
      case "coupons":
        return me.can.couponRead || me.can.couponManage;
      case "auditRead":
        return Boolean(me.can.auditRead);
      default:
        return true;
    }
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-white md:block">
      <div className="border-b p-4 text-lg font-semibold">Admin Panel</div>
      <nav className="space-y-1 p-3">
        {links.map((link) => {
          const active = navLinkIsActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded px-3 py-2 text-sm ${
                active
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-black"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <div className="pt-3 mt-3 border-t">
          <button
            type="button"
            onClick={() => {
              void fetch("/modules/admin/api/auth/session", {
                method: "DELETE",
              })
                .catch(() => null)
                .finally(() => {
                  router.push("/modules/admin/auth/sign-in");
                  router.refresh();
                });
            }}
            className="block w-full rounded px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </nav>
    </aside>
  );
}
