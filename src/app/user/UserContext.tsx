"use client";
import React, { createContext, useContext } from "react";
import useSWR from "swr";
import { useDispatch } from 'react-redux';
import { setCart, clearCart, setCartId } from '@/app/store';
import { getOrCreateCart } from '@/actions/cart-actions';
import { getCart } from '@/actions/cart-actions';
import { useRef } from "react";
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || `Request failed with status ${res.status}`);
  }
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
};

type User = {
  id: number | string;
  email: string;
  name?: string | null;
  image?: string | null;
};

type UserContextType = { user: User | null, isLoading: boolean };
const UserContext = createContext<UserContextType>({ user: null, isLoading: true });
type CartItem = {
  id: string;
  productId: number;
  title: string;
  price: number;
  quantity: number;
  image?: string;
};

declare global {
  interface Window { __cartMerged?: boolean }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useSWR("/user/api/session", fetcher, { refreshInterval: 60000 });
  const dispatch = useDispatch();
  const hasMerged = useRef(false);
  const prevUserId = useRef<string | null>(null);
  const router = useRouter();
  const wasLoggedIn = useRef(false);

  React.useEffect(() => {
    if (!isLoading) {
      if (data?.user) {
        // Only run merge if user ID has changed (handles NextAuth timing)
        if (prevUserId.current !== data.user.id && !hasMerged.current) {
          hasMerged.current = true;
          prevUserId.current = data.user.id;
          console.log('[UserContext] Calling merge API after login for user:', data.user);
          fetch("/user/api/products/cart/merge", { method: "POST" })
            .then(res => res.json())
            .then(async result => {
              console.log('[UserContext] Merge API result:', result);
              // Always fetch the latest cart after merge
              const mergedCart = await getOrCreateCart();
              const cartItems = (mergedCart.items || []).map((item: unknown) => {
                const i = item as CartItem;
                return {
                  id: i.id,
                  productId: i.productId,
                  title: i.title,
                  price: i.price,
                  quantity: i.quantity,
                  image: i.image ?? '',
                };
              });
              console.log('[UserContext] Setting Redux cart after login:', cartItems, 'cartId:', mergedCart.id);
              dispatch(setCart(cartItems));
              dispatch(setCartId(mergedCart.id));
              mutate('/user/api/cart');
              router.push('/user');
            });
        }
        // Clear any guest cart state before fetching user cart
        dispatch(clearCart());
        dispatch(setCartId(''));
      }
      getCart().then((result: unknown) => {
        if (!data?.user && result) {
          const r = result as { items?: unknown[]; id: string };
          const cartItems = (r.items || []).map((item: unknown) => {
            const i = item as CartItem;
            return {
              id: i.id,
              productId: i.productId,
              title: i.title,
              price: i.price,
              quantity: i.quantity,
              image: i.image ?? '',
            };
          });
          dispatch(setCart(cartItems));
          dispatch(setCartId(r.id));
        } else if (!data?.user) {
          dispatch(setCart([]));
          dispatch(setCartId(''));
        }
      });
    }
    if (!data?.user && wasLoggedIn.current) {
      hasMerged.current = false;
      prevUserId.current = null;
      wasLoggedIn.current = false;
      router.push('/'); // Redirect to homepage only once after logout
    }
  }, [data?.user, isLoading, dispatch, router]);
  return (
    <UserContext.Provider value={{ user: data?.user ? (data.user as User) : null, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
} 