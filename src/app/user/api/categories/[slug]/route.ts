import { getCategoryBySlug } from "@/actions/category";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const category = await getCategoryBySlug(slug);
    if (!category)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(category, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
