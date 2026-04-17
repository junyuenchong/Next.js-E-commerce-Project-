"use client";

/** Saved wishlist items. */
import Image from "next/image";
import Link from "next/link";
import { useWishlistPage } from "@/app/features/user/hooks";
import { formatPriceRM } from "@/app/lib/format-price";
import { IMG } from "@/app/lib/image-sizes";

export default function WishlistPage() {
  const { user, items, showSkeleton, remove } = useWishlistPage();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="mb-2 text-2xl font-bold">Wishlist</h1>
        <p className="mb-6 text-sm text-gray-600">
          Saved products stay here so you can compare and buy later.
        </p>

        {!user ? (
          <div className="min-h-[420px] rounded-lg bg-white p-8 text-center text-gray-600 shadow-sm">
            <p className="mb-4">Sign in to view your wishlist.</p>
            <Link
              href="/features/user/auth/sign-in"
              className="font-medium text-blue-600"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <div className="min-h-[420px]">
            {showSkeleton ? (
              <ul className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <li
                    key={`wishlist-skeleton-${idx}`}
                    className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4"
                  >
                    <div className="h-20 w-20 shrink-0 animate-pulse rounded bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
                    </div>
                    <div className="w-16 shrink-0">
                      <div className="h-8 animate-pulse rounded bg-gray-200" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : items.length === 0 ? (
              <p className="text-gray-600">No saved items yet.</p>
            ) : (
              <ul className="space-y-4">
                {items.map((row, index) => (
                  <li
                    key={row.id}
                    className="flex gap-4 bg-white rounded-lg border border-gray-100 p-4 items-center"
                  >
                    <Link
                      href={`/features/user/product/${row.product.id}`}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-gray-100"
                    >
                      <Image
                        src={row.product.imageUrl || "/placeholder.png"}
                        alt=""
                        fill
                        className="object-cover"
                        sizes={IMG.grid}
                        priority={index === 0}
                        unoptimized={
                          row.product.imageUrl?.startsWith("blob:") ?? false
                        }
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/features/user/product/${row.product.id}`}
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
                        href={`/features/user/product/${row.product.id}`}
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
        )}
      </div>
    </div>
  );
}
