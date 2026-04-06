"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUser } from "@/app/user/UserContext";
import CartSidebar from "@/app/user/components/CartSidebar/CartSidebar";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { useQueryClient } from "@tanstack/react-query";
import HeaderSearchBar from "../HeaderSearchBar/HeaderSearchBar";
import MobileSidebar from "../Sidebar/MobileSidebar";
import { menuItems } from "../menuItems";
import { signOut } from "next-auth/react";

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
  const router = useRouter();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const prevScrollYRef = useRef(0);
  const [isCartOpen, setCartOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const onSignOut = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      await fetch("/user/api/logout", { method: "POST" });
      signOut({ callbackUrl: "/" }); // Ensure NextAuth session is cleared
      queryClient.invalidateQueries({ queryKey: ["user-session"] });
      queryClient.invalidateQueries({ queryKey: ["user-cart"] });
      router.refresh();
    },
    [queryClient, router],
  );

  const onSignIn = useCallback(() => {
    router.push("/user/auth/sign-in");
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrolledUp = currentScrollY < prevScrollYRef.current;

      setIsOpen(scrolledUp || currentScrollY < 100);
      prevScrollYRef.current = currentScrollY;
    };

    prevScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header className="w-full sticky top-0 z-50">
        <div
          className={`w-full transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <AnnouncementBar />
          <div className="w-full flex justify-between items-center py-3 sm:py-4 bg-white/60 shadow-sm border-b border-gray-100 backdrop-blur-sm">
            <div className="flex justify-between items-center container mx-auto px-4 sm:px-6 md:px-8 w-full relative">
              <div className="flex flex-1 justify-start items-center gap-3 sm:gap-4 md:gap-6 min-w-0 z-10 pr-12 sm:pr-16 md:pr-20 lg:pr-24">
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
                <nav className="hidden md:flex gap-4 lg:gap-6 text-sm font-medium">
                  {menuItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </Link>
                  ))}
                  {categorySelector}
                </nav>
              </div>
              <Link
                href="/user"
                className="absolute left-1/2 -translate-x-1/2 text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-center whitespace-nowrap z-30 pointer-events-auto px-2 sm:px-4 bg-white/60 backdrop-blur-sm"
              >
                CJY SHOP
              </Link>
              <div className="flex flex-1 justify-end items-center gap-2 sm:gap-3 md:gap-4 min-w-0 z-10 pl-12 sm:pl-16 md:pl-20 lg:pl-24">
                <div className="hidden md:block w-full max-w-[200px] lg:max-w-[240px] mr-2 md:mr-4">
                  <HeaderSearchBar />
                </div>

                {user ? (
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
                    <span className="text-xs sm:text-sm text-gray-700 hidden lg:block truncate max-w-[120px]">
                      {user.email}
                    </span>
                    <Link
                      href="#"
                      className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 whitespace-nowrap"
                      onClick={onSignOut}
                    >
                      Sign Out
                    </Link>
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
                      href="/user/auth/sign-up"
                      className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 whitespace-nowrap"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
                <button
                  className="text-gray-700 hover:text-gray-900 relative flex-shrink-0"
                  onClick={openCart}
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
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Mobile search bar below header */}
      <div className="block md:hidden w-full px-4 sm:px-6 py-2 bg-white/90 border-b border-gray-100">
        <HeaderSearchBar />
      </div>
      <CartSidebar isOpen={isCartOpen} onClose={closeCart} />
      <MobileSidebar open={sidebarOpen} onClose={closeSidebar} />
    </>
  );
});

export default HeaderClient;
