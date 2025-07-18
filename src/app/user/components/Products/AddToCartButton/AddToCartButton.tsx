"use client";

import { Product } from '@prisma/client';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCart, setCartId } from '@/app/store';
import { addToCart } from '@/actions/cart-actions';
import { mutate } from 'swr';

type AddToCartButtonProps = {
    product: Product
}

const AddToCartButton = ({ product }: AddToCartButtonProps) => {
    const [isLoading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const handleAddToCart = async () => {
        if (isLoading) return;
        setLoading(true);
        try {
            // Use server action directly
            const data = await addToCart(product.id, 1) as { items?: unknown[]; id: string };
            const cartItems = (data.items || []).map((item: unknown) => {
                const i = item as { id: string; productId: number; title: string; price: number; quantity: number; image?: string };
                return {
                    id: i.id,
                    productId: i.productId,
                    title: i.title,
                    price: i.price,
                    quantity: i.quantity,
                    image: i.image ?? '',
                };
            });
            dispatch(setCart(cartItems));
            dispatch(setCartId(data.id));
            mutate('/user/api/cart');
        } catch {
            // setError("Failed to add to cart."); // This line was removed as per the edit hint
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <button
            onClick={handleAddToCart}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center min-w-[120px]"
        >
            {isLoading ? (
                <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                </div>
            ) : (
                'Add to Cart'
            )}
        </button>
            {/* {error && ( // This line was removed as per the edit hint */}
            {/*     <div className="text-red-600 text-sm mt-2 text-center">{error}</div> // This line was removed as per the edit hint */}
            {/* )} // This line was removed as per the edit hint */}
        </>
    );
};

export default AddToCartButton;