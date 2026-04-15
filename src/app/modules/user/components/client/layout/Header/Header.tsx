"use client";

import Link from "next/link";
import React, { memo } from "react";
import { useUser } from "@/app/modules/user/components/client/UserContext";
import HeaderSearchBar from "../HeaderSearchBar/HeaderSearchBar";
import MobileSidebar from "../Sidebar/MobileSidebar";
import { menuItems } from "../menuItems";
import { useHeaderNav } from "@/app/modules/user/hooks";

type HeaderClientProps = {
  categorySelector: React.ReactNode;
};

const AnnouncementBar = () => (
  <div className="w-full bg-black py-2">
    <div className="container mx-auto flex items-center justify-center px-8">
      <span className="text-center text-sm font-medium tracking-wide text-white">
        FREE SHIPPING ON OVER RM 15.00 * FREE RETURNS
      </span>
    </div>
  </div>
);

const HeaderClient = memo(function HeaderClient({
  categorySelector,
}: HeaderClientProps) {
  const { user } = useUser();
  const {
    headerVisible,
    sidebarOpen,
    cartQuantity,
    openSidebar,
    closeSidebar,
    onSignIn,
    onSignOut,
  } = useHeaderNav();

  return (
    <>
      <header className="w-full sticky top-0 z-50">
        <div
          className={`w-full transform transition-transform duration-300 ease-in-out ${
            headerVisible ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <AnnouncementBar />
          <div className="w-full flex justify-between items-center py-3 sm:py-4 bg-white/60 shadow-sm border-b border-gray-100 backdrop-blur-sm">
            <div className="flex items-center gap-3 md:gap-4 container mx-auto px-4 sm:px-6 md:px-8 w-full min-w-0">
              <div className="flex flex-1 justify-start items-center gap-3 sm:gap-4 md:gap-6 min-w-0">
                <button
                  className="text-gray-700 hover:text-gray-900 md:hidden flex-shrink-0"
                  onClick={openSidebar}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                <nav className="hidden md:flex flex-wrap gap-x-4 gap-y-1 lg:gap-6 text-sm font-medium text-gray-700">
                  {menuItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="whitespace-nowrap hover:text-gray-900"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {categorySelector}
                </nav>
              </div>

              <Link
                href="/modules/user"
                className="flex-shrink-0 text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-gray-900 px-2"
              >
                CJY SHOP
              </Link>

              <div className="flex flex-1 justify-end items-center gap-2 sm:gap-3 min-w-0">
                <div className="hidden md:block flex-1 max-w-[min(100%,280px)] min-w-[140px] relative z-20">
                  <HeaderSearchBar />
                </div>

                {user ? (
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <Link
                      href="/modules/user/profile"
                      className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 whitespace-nowrap hidden sm:inline"
                    >
                      Profile
                    </Link>
                    <span className="text-xs sm:text-sm text-gray-600 hidden lg:block truncate max-w-[140px]">
                      {user.email}
                    </span>
                    <button
                      type="button"
                      className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 whitespace-nowrap"
                      onClick={onSignOut}
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <button
                      type="button"
                      className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 whitespace-nowrap"
                      onClick={onSignIn}
                    >
                      Sign In
                    </button>
                    <Link
                      href="/modules/user/auth/sign-up"
                      className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 whitespace-nowrap"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
                <Link
                  href="/modules/user/cart"
                  className="text-gray-700 hover:text-gray-900 relative flex-shrink-0"
                  aria-label="Open cart"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 sm:w-6 sm:h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 8h14l-1.5 12.5a1 1 0 01-1 .5H7a1 1 0 01-1-.5L4 8zm3-3a4 4 0 018 0v1H8V5z"
                    />
                  </svg>
                  <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] sm:text-xs w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center">
                    {cartQuantity}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Mobile search bar below header */}
      <div className="block md:hidden w-full px-4 sm:px-6 py-2 bg-white/90 border-b border-gray-100">
        <HeaderSearchBar />
      </div>
      <MobileSidebar open={sidebarOpen} onClose={closeSidebar} />
    </>
  );
});

export default HeaderClient;
