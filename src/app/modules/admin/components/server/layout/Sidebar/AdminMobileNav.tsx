"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  if (href === "/modules/admin/dashboard") return pathname === href;
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

export default function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchAdminMe,
    staleTime: 60_000,
  });

  const links = useMemo(() => {
    return allLinks.filter((link) => {
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
  }, [me?.can]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    // Close drawer on route change.
    close();
  }, [pathname, close]);

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 border-b bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? "Close" : "Menu"}
          </button>
          <Link
            href="/modules/admin/dashboard"
            className="text-sm font-semibold text-gray-900"
          >
            Admin Panel
          </Link>
        </div>
      </header>

      {open ? (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            onClick={close}
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu overlay"
          />
          <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl">
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <div className="font-semibold text-gray-900">Navigation</div>
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>
            <nav className="p-3 space-y-1">
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
        </div>
      ) : null}
    </>
  );
}
