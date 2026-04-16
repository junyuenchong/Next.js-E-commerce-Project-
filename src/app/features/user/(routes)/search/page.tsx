/** Search & filter results (dynamic). */
import type { Metadata } from "next";
import type { ProductCardProduct } from "@/app/features/user/types";
import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import SalesCampaignBanner from "@/app/features/user/components/client/SalesCampaignBanner/SalesCampaignBanner";
import LoadError from "@/app/features/user/components/shared/LoadError";
import ProductGrid from "@/app/features/user/components/client/Products/ProductGrid/ProductGrid";
import { parseSearchQuery } from "@/app/lib/search-query";
import { serializeProductCardListForClient } from "@/app/lib/serialize-product-card";
import { getAllCategories } from "@/backend/modules/category";
import {
  searchProductsWithFilters,
  type ProductSearchSort,
} from "@/backend/modules/product";
import Loading from "../loading";

export const dynamic = "force-dynamic";

const BROWSE_LIMIT = 200;

type SearchMode = "browse" | "search";

function searchMode(query: string | null): SearchMode {
  switch (query) {
    case null:
      return "browse";
    default:
      return "search";
  }
}

function first(param: string | string[] | undefined): string | undefined {
  if (Array.isArray(param)) return param[0];
  return param;
}

function num(param: string | undefined): number | undefined {
  if (param === undefined || param === "") return undefined;
  const n = Number(param);
  return Number.isFinite(n) ? n : undefined;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ query?: string | string[] }>;
}): Promise<Metadata> {
  const p = searchParams ? await searchParams : {};
  const q = parseSearchQuery(p.query ?? null);
  const mode = searchMode(q);
  switch (mode) {
    case "browse":
      return {
        title: "All products",
        description: "Browse all products at CJY E-Commerce.",
        robots: { index: true, follow: true },
        openGraph: {
          title: "All products | CJY E-Commerce",
          description: "Browse all products at CJY E-Commerce.",
        },
      };
    default:
      return {
        title: `Search: ${q}`,
        description: `Results for “${q}” — CJY E-Commerce.`,
        robots: { index: true, follow: true },
        openGraph: {
          title: `Search: ${q} | CJY E-Commerce`,
          description: `Results for “${q}” — CJY E-Commerce.`,
        },
      };
  }
}

type FilterProps = {
  query: string | null;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort: ProductSearchSort;
};

const SORT_OPTIONS: { value: ProductSearchSort; label: string }[] = [
  { value: "relevance", label: "Relevance (newest id)" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_az", label: "Name A–Z" },
];

function parseSortParam(raw: string | undefined): ProductSearchSort {
  const allowed = new Set(SORT_OPTIONS.map((o) => o.value));
  if (raw && allowed.has(raw as ProductSearchSort))
    return raw as ProductSearchSort;
  return "relevance";
}

async function SearchResults(filters: FilterProps) {
  try {
    const mode = searchMode(filters.query);
    const hasFilters =
      Boolean(filters.categorySlug) ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.minRating !== undefined;

    const take = mode === "browse" && !hasFilters ? BROWSE_LIMIT : 120;

    const raw = await searchProductsWithFilters({
      query: filters.query?.trim() || undefined,
      categorySlug: filters.categorySlug,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      minRating: filters.minRating,
      sort: filters.sort,
      take,
    });

    const products = serializeProductCardListForClient(
      (Array.isArray(raw) ? raw : []) as ProductCardProduct[],
    );

    let title: ReactNode;
    let subtitle: string;
    switch (true) {
      case mode === "browse" && !hasFilters:
        title = <>All products</>;
        subtitle = "Browse the catalog";
        break;
      default:
        title = filters.query ? (
          <>&quot;{filters.query}&quot;</>
        ) : (
          <>Filtered results</>
        );
        subtitle = "Search & filters";
    }

    let body: ReactNode;
    switch (products.length > 0) {
      case true:
        body = <ProductGrid products={products} />;
        break;
      default:
        body = (
          <p className="text-center text-gray-500 py-12">No products found.</p>
        );
    }

    return (
      <>
        <header className="bg-red-50 p-4 text-center space-y-2">
          <div className="flex justify-center">
            <Link
              href="/features/user"
              className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
            >
              ← Back to home
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-red-600">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </header>
        <section className="container mx-auto py-8">{body}</section>
      </>
    );
  } catch (e) {
    console.error("[search]", e);
    return <LoadError title="Could not load results" />;
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = searchParams ? await searchParams : {};
  const q = parseSearchQuery(p.query ?? null);
  const categorySlug = first(p.category);
  const minPrice = num(first(p.minPrice));
  const maxPrice = num(first(p.maxPrice));
  const minRating = num(first(p.minRating));
  const sort = parseSortParam(first(p.sort));

  const categories = await getAllCategories();

  return (
    <div>
      <SalesCampaignBanner />
      <div className="container mx-auto py-4 px-4">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/features/user"
            className="inline-flex items-center font-medium text-blue-700 hover:text-blue-900 hover:underline"
          >
            ← Home
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-gray-600">Search & browse active products</span>
        </div>
        <form
          method="GET"
          action="/features/user/search"
          className="flex flex-wrap gap-3 items-end bg-white p-4 rounded-lg shadow-sm border border-gray-100"
        >
          <label className="flex flex-col text-xs font-medium text-gray-700">
            Keywords
            <input
              type="search"
              name="query"
              placeholder="Search products"
              defaultValue={q ?? ""}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[180px]"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-700">
            Category
            <select
              name="category"
              defaultValue={categorySlug ?? ""}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[160px]"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-700">
            Min price
            <input
              type="number"
              name="minPrice"
              step="0.01"
              min={0}
              placeholder="0"
              defaultValue={minPrice ?? ""}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-28"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-700">
            Max price
            <input
              type="number"
              name="maxPrice"
              step="0.01"
              min={0}
              placeholder="Any"
              defaultValue={maxPrice ?? ""}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm w-28"
            />
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-700">
            Min rating
            <select
              name="minRating"
              defaultValue={minRating ?? ""}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
              <option value="2">2+ stars</option>
              <option value="1">1+ stars</option>
            </select>
          </label>
          <label className="flex flex-col text-xs font-medium text-gray-700">
            Sort by
            <select
              name="sort"
              defaultValue={sort}
              className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[200px]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
          >
            Search
          </button>
        </form>
      </div>
      <Suspense fallback={<Loading />}>
        <SearchResults
          query={q}
          categorySlug={categorySlug}
          minPrice={minPrice}
          maxPrice={maxPrice}
          minRating={minRating}
          sort={sort}
        />
      </Suspense>
    </div>
  );
}
