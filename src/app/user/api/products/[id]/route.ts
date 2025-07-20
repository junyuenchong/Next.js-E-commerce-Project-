import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/actions/product";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const id = context.params.id;
  if (!id) {
    return NextResponse.json({ error: "Product ID required" }, { status: 400 });
  }
  try {
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json(product, {
      status: 200,
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}