// app/api/products/route.ts

import { getAllProducts } from "@/actions/product";
import { NextResponse } from "next/server";


export async function GET() {
  const products = await getAllProducts();
  return NextResponse.json(products);
}
