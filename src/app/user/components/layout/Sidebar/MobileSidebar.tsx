"use client";
import React from "react";
import { useUser } from "@/app/user/UserContext";
import { useRouter } from "next/navigation";
import { menuItems } from '../menuItems';
import Image from "next/image";

export default function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useUser();
  const router = useRouter();

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 rounded-r-3xl shadow-lg transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ maxWidth: 320 }}
      >
        <div className="flex flex-col h-full">
          {/* User Info */}
          <div className="flex flex-col items-center py-8 border-b">
            <div className="w-20 h-20 rounded-full bg-gray-200 mb-2 overflow-hidden flex items-center justify-center">
              {user?.image ? (
                <Image src={user.image} alt="avatar" width={80} height={80} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 text-3xl font-bold">
                  {user?.name ? user.name[0].toUpperCase() : "U"}
                </div>
              )}
            </div>
            <div className="font-bold text-lg">{user?.name || "User Name"}</div>
            <div className="text-xs text-gray-500">{user?.email}</div>
          </div>
          {/* Menu */}
          <nav className="flex-1 px-6 py-4">
            {menuItems.map(item => (
              <button
                key={item.label}
                className="flex items-center w-full py-3 px-2 rounded-lg hover:bg-gray-100 text-left text-base font-medium gap-3"
                onClick={() => { router.push(item.href); onClose(); }}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          {/* Sign Out */}
          <div className="p-6 border-t">
            <button
              className="w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
              onClick={async () => {
                await fetch("/api/logout", { method: "POST" });
                router.refresh();
                onClose();
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
} 