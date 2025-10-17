"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import React from "react";

// Preload data immediately
const preloadData = () => {
  // Preload the first page of products
  fetch('/admin/api/products?limit=20&page=1')
    .then(response => response.json())
    .then(data => {
      console.log('🚀 Preloaded products:', data.length);
    })
    .catch(error => {
      console.error('❌ Preload failed:', error);
    });
};

// Dynamic imports for better performance
const ProductForm = dynamic(() => import("../components/products/main/ProductForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Loading form...</span>
    </div>
  ),
});

const ProductList = dynamic(() => import("../components/products/main/ProductList"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Loading products...</span>
    </div>
  ),
});

export default function ProductsPage() {
  const productListRef = useRef<{ handleRefresh: () => void }>(null);

  // Preload data on component mount
  useEffect(() => {
    console.log('🚀 Starting data preload for admin products page');
    preloadData();
  }, []);

  // Callback to refresh product list
  const handleProductCreated = () => {
    productListRef.current?.handleRefresh();
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
          <p className="text-gray-600">Create, edit, and manage your products</p>
        </div>

        {/* Product Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Product</h2>
          <ProductForm onProductCreated={handleProductCreated} />
        </div>

        {/* Product List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Product List</h2>
          <ProductList ref={productListRef} />
        </div>
      </div>
    </main>
  );
}
