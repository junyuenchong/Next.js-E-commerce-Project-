"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, Tag, Package, LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { name: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
  { name: "Categories", href: "/admin/categories", icon: <Tag size={18} /> },
  { name: "Products", href: "/admin/products", icon: <Package size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    setMounted(true);

    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!mounted) {
    return (
      <aside className="fixed top-0 left-0 h-full w-64 bg-gray-950 text-white shadow-lg z-50">
        {/* Empty state for SSR */}
      </aside>
    );
  }

  // Mobile header bar
  if (isMobile) {
    return (
      <>
        {/* Header Bar */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-gray-950 text-white flex items-center justify-between px-4 z-50 shadow-md">
          <button
            aria-label="Open sidebar"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-800 transition"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold tracking-wide">Admin Panel</h1>
          <div className="w-8" /> {/* Spacer for symmetry */}
        </header>

        {/* Sidebar Drawer */}
        <div
          className={clsx(
            "fixed inset-0 z-50 transition-all duration-300",
            sidebarOpen ? "visible" : "pointer-events-none"
          )}
        >
          {/* Overlay */}
          <div
            className={clsx(
              "absolute inset-0 bg-transparent bg-opacity-40 transition-opacity duration-300",
              sidebarOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <aside
            className={clsx(
              "absolute top-0 left-0 h-full w-64 bg-gray-950 text-white flex flex-col justify-between shadow-lg transition-transform duration-300",
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div>
              {/* Logo / Brand */}
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-wide text-white">Admin Panel</h1>
                <button
                  aria-label="Close sidebar"
                  onClick={() => setSidebarOpen(false)}
                  className="ml-2 p-1 rounded hover:bg-gray-800 transition"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" className="text-gray-400">
                    <line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" strokeWidth="2" />
                    <line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              </div>

              {/* Nav links */}
              <nav className="p-4 space-y-1">
                <h3 className="text-sm text-gray-400 uppercase mb-2 px-2">Main</h3>
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={clsx(
                        "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition",
                        isActive
                          ? "bg-gray-800 text-white"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {link.icon}
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-gray-800">
              <button className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full transition">
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </aside>
        </div>
        {/* Spacer for header */}
        <div className="h-14" />
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-950 text-white flex flex-col justify-between shadow-lg z-50">
      <div>
        {/* Logo / Brand */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-wide text-white">Admin Panel</h1>
        </div>

        {/* Nav links */}
        <nav className="p-4 space-y-1">
          <h3 className="text-sm text-gray-400 uppercase mb-2 px-2">Main</h3>
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={clsx(
                  "flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium transition",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-800">
        <button className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 w-full transition">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}