// app/api/products/route.ts

import { getAllProducts } from "@/actions/product";
import { NextResponse } from "next/server";


export async function GET() {
  try {
    const products = await getAllProducts();
    return NextResponse.json(products || []);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json([]);
  }
}
