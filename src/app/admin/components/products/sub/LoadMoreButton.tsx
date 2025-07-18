"use client";

import React from "react";

interface LoadMoreButtonProps {
  isLoading: boolean;
  isEnd: boolean;
  hasProducts: boolean;
  onLoadMore: () => void;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  isLoading,
  isEnd,
  hasProducts,
  onLoadMore,
}) => {
  if (isEnd && !hasProducts) {
    return (
      <div className="text-center py-4 text-gray-500">
        No products found.
      </div>
    );
  }

  if (isEnd || !hasProducts) {
    return null;
  }

  return (
    <div className="flex justify-center py-4">
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className={`px-6 py-2 rounded bg-blue-600 text-white text-sm font-semibold flex items-center gap-2 transition-colors ${
          isLoading 
            ? "opacity-60 cursor-not-allowed" 
            : "hover:bg-blue-700"
        }`}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 mr-2 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
            Loading...
          </>
        ) : (
          "Load More"
        )}
      </button>
    </div>
  );
};

export default LoadMoreButton; 