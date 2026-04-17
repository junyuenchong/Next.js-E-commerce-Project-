"use client";

import React, { memo } from "react";
import { useHeaderCategorySelector } from "@/app/features/user/hooks";

const HeaderCategorySelector = memo(function HeaderCategorySelector() {
  const { categories, open, toggleOpen, pickCategory, dropdownRef } =
    useHeaderCategorySelector();

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        className="text-gray-700 hover:text-gray-900 text-sm font-medium flex items-center gap-1"
        onClick={toggleOpen}
        aria-expanded={open}
      >
        Categories
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
            <div className="py-2">
              {categories.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No categories available
                </div>
              ) : (
                categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors duration-100"
                    onClick={() => pickCategory(category.slug)}
                  >
                    {category.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default HeaderCategorySelector;
