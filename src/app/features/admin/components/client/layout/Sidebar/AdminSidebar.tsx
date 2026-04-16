"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http from "@/app/utils/http";
import type { AdminMe } from "@/app/features/admin/types";
import {
  ADMIN_NAV_LINKS,
  adminNavLinkIsActive,
  filterAdminNavLinks,
} from "@/app/features/admin/nav/admin-nav";

async function fetchAdminMe(): Promise<AdminMe> {
  const { data } = await http.get<AdminMe>("/features/admin/api/me");
  return data;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Feature: keep admin permissions responsive without constant refetch jitter.
  // Guard: login/logout path explicitly clears this cache to prevent role bleed.
  // Note: short stale window smooths route switches inside one active session.
  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchAdminMe,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const links = filterAdminNavLinks(ADMIN_NAV_LINKS, me);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-white md:block">
      <div className="border-b p-4 text-lg font-semibold">Admin Panel</div>
      <nav className="space-y-1 p-3">
        {links.map((link) => {
          const active = adminNavLinkIsActive(pathname, link.href);
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
              void fetch("/features/admin/api/auth/session", {
                method: "DELETE",
              })
                .catch(() => null)
                .finally(() => {
                  queryClient.removeQueries({ queryKey: ["admin-me"] });
                  router.push("/features/admin/auth/sign-in");
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
