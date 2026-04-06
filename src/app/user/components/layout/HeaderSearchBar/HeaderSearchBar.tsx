"use client";

import React, { memo } from "react";

const HeaderSearchBar = memo(function HeaderSearchBar() {
  return (
    <form action="/user/search" method="get" className="w-full max-w-full">
      <div className="relative flex items-center w-full gap-1.5">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none z-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
          type="text"
          name="query"
          placeholder="Search..."
          className="flex-1 min-w-0 pl-7 sm:pl-8 pr-2 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black transition-all outline-none bg-white"
        />

        <button
          type="submit"
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium bg-black text-white rounded-md hover:bg-gray-800 active:bg-gray-900 transition-colors whitespace-nowrap flex-shrink-0"
        >
          Search
        </button>
      </div>
    </form>
  );
});

export default HeaderSearchBar;
