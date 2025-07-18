import { getAllProducts, searchProducts, updateProduct } from "@/actions/product";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");
  const q = searchParams.get("q") || "";
  
  const limit = limitParam ? parseInt(limitParam, 10) : 20;
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  
  try {
    let products: unknown[] = [];
    if (q.trim()) {
      products = await searchProducts(q);
    } else {
      products = await getAllProducts(limit, page);
    }
    const headers = {
      "Cache-Control": "no-store",
      "x-nextjs-cache-tags": "products",
      "Content-Type": "application/json",
      "x-response-time": Date.now().toString(),
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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...data } = body as { id: number; [key: string]: unknown };
    if (!id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
    }
    const updated = await updateProduct(Number(id), data);

    // Emit products_updated event
    const io = (global as unknown as { io?: { to: (room: string) => { emit: (event: string) => void } } }).io;
    if (io) {
      io.to('products').emit('products_updated');
      console.log('🔔 Emitted products_updated event to products room');
    } else {
      console.warn('⚠️ Socket.IO server instance not found, cannot emit products_updated');
    }

    return NextResponse.json(updated, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 