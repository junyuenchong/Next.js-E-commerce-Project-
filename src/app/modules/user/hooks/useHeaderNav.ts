"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/redux/store";

export function useHeaderNav() {
  const router = useRouter();
  const [headerVisible, setHeaderVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = useSelector((s: RootState) => s.cart.items);
  const cartQuantity = useMemo(
    () => items.reduce((a, i) => a + i.quantity, 0),
    [items],
  );

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHeaderVisible(y < 80 || y < last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const onSignIn = useCallback(() => {
    router.push("/modules/user/auth/sign-in");
  }, [router]);

  const onSignOut = useCallback(() => {
    void signOut({ callbackUrl: "/modules/user" });
  }, []);

  return {
    headerVisible,
    sidebarOpen,
    cartQuantity,
    openSidebar,
    closeSidebar,
    onSignIn,
    onSignOut,
  };
}
