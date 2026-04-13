"use client";

/** Saved wishlist items. */
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import http from "@/app/lib/http";
import { useUser } from "@/app/modules/user/client/components/UserContext";
import { formatPriceRM } from "@/app/lib/format-price";
import { IMG } from "@/app/lib/image-sizes";

type Item = {
  id: number;
  productId: number;
  product: {
    id: number;
    title: string;
    slug: string;
    price: number;
    imageUrl: string | null;
    stock: number;
    isActive: boolean;
  };
};

export default function WishlistPage() {
  const { user, isLoading: authLoading } = useUser();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await http.get<Item[]>("/modules/user/api/wishlist");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void load();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, user, load]);

  const remove = async (productId: number) => {
    await http.delete(
      `/modules/user/api/wishlist?productId=${encodeURIComponent(String(productId))}`,
    );
    await load();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen py-16 text-center px-4">
        <p className="mb-4">Sign in to view your wishlist.</p>
        <Link
          href="/modules/user/auth/sign-in"
          className="text-blue-600 font-medium"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Wishlist</h1>
        {items.length === 0 ? (
          <p className="text-gray-600">No saved items yet.</p>
        ) : (
          <ul className="space-y-4">
            {items.map((row) => (
              <li
                key={row.id}
                className="flex gap-4 bg-white rounded-lg border border-gray-100 p-4 items-center"
              >
                <Link
                  href={`/modules/user/product/${row.product.id}`}
                  className="relative w-20 h-20 shrink-0 rounded overflow-hidden bg-gray-100"
                >
                  <Image
                    src={row.product.imageUrl || "/placeholder.png"}
                    alt=""
                    fill
                    className="object-cover"
                    sizes={IMG.grid}
                    unoptimized={
                      row.product.imageUrl?.startsWith("blob:") ?? false
                    }
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/modules/user/product/${row.product.id}`}
                    className="font-medium text-gray-900 hover:underline line-clamp-2"
                  >
                    {row.product.title}
                  </Link>
                  <p className="text-sm text-red-600 font-semibold mt-1">
                    {formatPriceRM(row.product.price)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    href={`/modules/user/product/${row.product.id}`}
                    className="text-xs text-center px-3 py-1.5 bg-blue-600 text-white rounded-md"
                  >
                    View
                  </Link>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => remove(row.productId)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
