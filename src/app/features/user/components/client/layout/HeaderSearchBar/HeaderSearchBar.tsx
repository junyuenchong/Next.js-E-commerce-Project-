"use client";

import { useRouter } from "next/navigation";
import React, { memo } from "react";
import { navigateToSearch } from "@/app/features/user/components/client";

const HeaderSearchBar = memo(function HeaderSearchBar() {
  const router = useRouter();

  return (
    <form
      className="w-full max-w-full"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const field = e.currentTarget.elements.namedItem("query");
        if (!(field instanceof HTMLInputElement)) return;
        navigateToSearch(router, field.value);
      }}
    >
      <div className="relative flex items-stretch w-full gap-2">
        <div className="relative flex-1 min-w-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="search"
            name="query"
            placeholder="Search products…"
            autoComplete="off"
            className="h-9 w-full min-w-0 rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-xs font-normal text-gray-900 shadow-sm placeholder:text-gray-400 placeholder:font-normal placeholder:text-xs focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>

        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-gray-800 active:bg-black"
        >
          Search
        </button>
      </div>
    </form>
  );
});

export default HeaderSearchBar;
