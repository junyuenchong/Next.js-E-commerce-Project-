"use client";

import React from "react";
import ProductItem, { ProductWithCategory, ProductItemProps } from "../types/ProductItem";

interface ProductGridProps {
  products: ProductWithCategory[];
  itemProps?: Omit<ProductItemProps, "product">;
  onProductCreated?: () => void;
  onProductUpdated?: () => void;
  onProductDeleted?: () => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, itemProps = {}, onProductCreated, onProductUpdated, onProductDeleted }) => {
  return (
    <div className="w-full">
      {products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No products found</div>
          <div className="text-gray-400 text-sm mt-2">Create your first product to get started</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
          {products.map((product, index) => (
            <div key={product.id} className="flex justify-center items-stretch">
              <ProductItem
                product={product}
                editingId={itemProps.editingId}
                editForm={itemProps.editForm}
                previewUrl={itemProps.previewUrl}
                editErrors={itemProps.editErrors}
                handleEditChange={itemProps.handleEditChange}
                handleImageChange={itemProps.handleImageChange}
                handleUpdate={itemProps.handleUpdate}
                setEditingId={itemProps.setEditingId}
                handleEditClick={itemProps.handleEditClick}
                handleDelete={itemProps.handleDelete}
                onProductCreated={onProductCreated}
                onProductUpdated={onProductUpdated}
                onProductDeleted={onProductDeleted}
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGrid; 