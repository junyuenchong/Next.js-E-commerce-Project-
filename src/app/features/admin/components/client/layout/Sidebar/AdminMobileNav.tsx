"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

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

  const links = useMemo(() => filterAdminNavLinks(ADMIN_NAV_LINKS, me), [me]);

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
            href="/features/admin/dashboard"
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
        </div>
      ) : null}
    </>
  );
}
