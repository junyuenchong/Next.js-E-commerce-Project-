/**
 * Admin Product Components - Main Export File
 * 
 * This file provides a centralized export for all admin product management components.
 * Components are organized by their purpose and can be imported individually or as a group.
 */

// ============================================================================
// MAIN COMPONENTS
// ============================================================================
// Core product management components
export { default as ProductList } from "./main/ProductList";
export { default as ProductForm } from "./main/ProductForm";

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
// UI components used by main components
export { default as ProductSearch } from "./sub/ProductSearch";
export { default as ProductGrid } from "./sub/ProductGrid";
export { default as LoadMoreButton } from "./sub/LoadMoreButton";

// ============================================================================
// TYPE COMPONENTS
// ============================================================================
// Components that define types and individual item rendering
export { default as ProductItem } from "./types/ProductItem";

// ============================================================================
// CUSTOM HOOKS
// ============================================================================
// State management and business logic hooks
export { useProductList } from "./hooks/useProductList";

// ============================================================================
// TYPE EXPORTS
// ============================================================================
// TypeScript type definitions for external use
export type { ProductWithCategory, ProductItemProps } from "./types/ProductItem";

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================
// Grouped exports for common use cases
import ProductList from "./main/ProductList";
import ProductForm from "./main/ProductForm";
import ProductItem from "./types/ProductItem";
import ProductSearch from "./sub/ProductSearch";
import ProductGrid from "./sub/ProductGrid";
import LoadMoreButton from "./sub/LoadMoreButton";
import { useProductList } from "./hooks/useProductList";

export const ProductComponents = {
  ProductList,
  ProductForm,
  ProductItem,
  ProductSearch,
  ProductGrid,
  LoadMoreButton,
} as const;

export const ProductHooks = {
  useProductList,
} as const; 