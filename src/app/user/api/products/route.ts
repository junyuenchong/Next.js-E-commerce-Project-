// Product API route: handles fetching and adding products

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Cache for 30 seconds

import { getAllProducts, searchProducts } from "@/actions/product";
import { getProductsByCategorySlug } from "@/actions/category";
import { addToCart } from "@/actions/cart-actions";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");
  const q = searchParams.get("q") || "";
  const categorySlug = searchParams.get("category");
  
  const limit = limitParam ? parseInt(limitParam, 10) : 20; // Increased default limit
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  
  let products;
  try {
    if (q.trim()) {
      products = await searchProducts(q);
    } else if (categorySlug) {
      products = await getProductsByCategorySlug(categorySlug, limit, page);
    } else {
      products = await getAllProducts(limit, page);
    }
    
    // Add performance headers
    const headers = {
      "Cache-Control": "no-store", // Always fetch fresh data
      "x-nextjs-cache-tags": "products",
      "Content-Type": "application/json",
      "x-response-time": Date.now().toString(), // For debugging
      "x-products-count": products.length.toString(),
    };
    
    return NextResponse.json(products, { 
      status: 200, 
      headers
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { productId, quantity } = await req.json();
    console.log('Received productId:', productId, 'Type:', typeof productId);
    const parsedProductId = Number(productId);
    if (!parsedProductId || isNaN(parsedProductId)) {
      return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
    }
    const result = await addToCart(parsedProductId, Number(quantity) || 1);
    return NextResponse.json({ success: true, cart: result }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
