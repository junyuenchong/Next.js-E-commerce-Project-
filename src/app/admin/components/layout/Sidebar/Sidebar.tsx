"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, Tag, Package, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { name: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard size={18} /> },
  { name: "Categories", href: "/admin/categories", icon: <Tag size={18} /> },
  { name: "Products", href: "/admin/products", icon: <Package size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <aside className="fixed top-0 left-0 h-full w-64 bg-gray-950 text-white shadow-lg z-50">
        {/* Empty state for SSR */}
      </aside>
    );
  }

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