import { NextResponse } from "next/server";
import { cacheKeys } from "@/app/lib/redis";
import { getCachedJson, setCachedJson } from "@/app/lib/redis";
import { getStorefrontCategoriesService } from "@/backend/modules/category/category.service";

const TTL_SECONDS = 300;

export async function GET() {
  try {
    const key = cacheKeys.categoriesAll();
    const cached = await getCachedJson<unknown>(key);
    if (cached != null) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          "X-Cache": "HIT",
        },
      });
    }

    const categories = await getStorefrontCategoriesService();
    await setCachedJson(key, categories, TTL_SECONDS);

    return NextResponse.json(categories, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Cache": "MISS",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
