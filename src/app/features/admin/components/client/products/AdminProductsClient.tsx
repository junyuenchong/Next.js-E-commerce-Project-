"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import http from "@/app/utils/http";
import ProductItem from "@/app/features/admin/components/client/products/types/ProductItem";
import {
  useAdminProductList,
  type AdminProductListHandle,
} from "@/app/features/admin/shared";

type Me = { can: { productCreate?: boolean } };

async function fetchMe(): Promise<Me> {
  const { data } = await http.get<Me>("/features/admin/api/me");
  return data;
}

export default function AdminProductsClient() {
  const listRef = useRef<AdminProductListHandle | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  // Feature: operator-friendly sort presets for merchandising and stock triage.
  const [sortKey, setSortKey] = useState<
    | "relevance"
    | "nameAZ"
    | "nameZA"
    | "priceLowToHigh"
    | "priceHighToLow"
    | "stockLowToHigh"
    | "stockHighToLow"
    | "recentlyUpdated"
  >("recentlyUpdated");

  // Feature: keep admin permissions responsive without constant refetch jitter.
  // Guard: login/logout path explicitly clears this cache to prevent role bleed.
  // Note: short stale window smooths route switches inside one active session.
  const { data: me } = useQuery({
    queryKey: ["admin-me"],
    queryFn: fetchMe,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const { products, isLoading, hasMore, handleLoadMore, itemProps } =
    useAdminProductList(listRef, { searchQuery: committedSearch, sortKey });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-600">
            CRUD, stock, and reviews on each card. Search by title, description,
            or category. Image upload uses Cloudinary from the product editor.
          </p>
        </div>
        {me?.can.productCreate ? (
          <Link
            href="/features/admin/products/new"
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add product
          </Link>
        ) : null}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          // Guard: commit search only on submit so pagination/sort stay stable while typing.
          setCommittedSearch(searchDraft.trim());
        }}
      >
        <input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Search products…"
          className="min-w-[200px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          aria-label="Sort products"
        >
          <option value="recentlyUpdated">Recently Updated</option>
          <option value="relevance">Default (Newest First)</option>
          <option value="nameAZ">Name A to Z</option>
          <option value="nameZA">Name Z to A</option>
          <option value="priceLowToHigh">Price Low to High</option>
          <option value="priceHighToLow">Price High to Low</option>
          <option value="stockLowToHigh">Stock Low to High</option>
          <option value="stockHighToLow">Stock High to Low</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          Search
        </button>
        {committedSearch ? (
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            onClick={() => {
              setCommittedSearch("");
              setSearchDraft("");
            }}
          >
            Clear
          </button>
        ) : null}
      </form>

      {products.length === 0 && !isLoading ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
          No products match. Adjust search or use &quot;Load more&quot; on the
          default list.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product, i) => (
            <ProductItem
              key={product.id}
              product={product}
              {...itemProps}
              priority={i < 4}
            />
          ))}
        </div>
      )}

      {hasMore && !committedSearch ? (
        <button
          type="button"
          onClick={() => handleLoadMore()}
          disabled={isLoading}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
        >
          {isLoading ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
