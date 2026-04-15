import {
  createCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from "@/backend/modules/category";
import { NextResponse } from "next/server";
import {
  ADMIN_CACHE_KEYS,
  ADMIN_CACHE_TTL_SECONDS,
  bustAdminCategoriesListCache,
  getAdminCachedJson,
  setAdminCachedJson,
} from "@/backend/modules/admin-cache";
import {
  adminCategoryCreateBodySchema,
  adminCategoryPatchBodySchema,
} from "@/shared/schema/admin";
import {
  adminApiRequire,
  adminApiRequireCatalogAccess,
} from "@/backend/core/admin-api-guard";
import {
  adminActorNumericId,
  logAdminAction,
} from "@/backend/core/admin-action-log";
import { jsonInternalServerError } from "@/backend/lib/api-error";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const g = await adminApiRequireCatalogAccess();
  if (!g.ok) return g.response;

  try {
    const key = ADMIN_CACHE_KEYS.categoriesList;
    const hit = await getAdminCachedJson<unknown>(key);
    if (hit) {
      return NextResponse.json(hit, {
        status: 200,
        headers: { "Cache-Control": "private, max-age=30" },
      });
    }
    const categories = await getAllCategories();
    await setAdminCachedJson(
      key,
      categories,
      ADMIN_CACHE_TTL_SECONDS.categoriesList,
    );
    return NextResponse.json(categories, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error: unknown) {
    return jsonInternalServerError(error, "[admin/api/categories GET]");
  }
}

export async function POST(req: Request) {
  const g = await adminApiRequire("product.update");
  if (!g.ok) return g.response;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = adminCategoryCreateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const category = await createCategory(parsed.data.name);
    const aid = adminActorNumericId(g.user);
    if (
      aid != null &&
      category &&
      typeof category === "object" &&
      "id" in category
    ) {
      void logAdminAction({
        actorUserId: aid,
        action: "category.create",
        targetType: "Category",
        targetId: String((category as { id: number }).id),
        metadata: { name: parsed.data.name },
      });
    }
    return NextResponse.json(category, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return jsonInternalServerError(error, "[admin/api/categories POST]");
  }
}

export async function PATCH(req: Request) {
  const g = await adminApiRequire("product.update");
  if (!g.ok) return g.response;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = adminCategoryPatchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const updated = await updateCategory(parsed.data.id, parsed.data.name);
    if (updated && typeof updated === "object" && "message" in updated) {
      return NextResponse.json(updated, { status: 404 });
    }
    const aid = adminActorNumericId(g.user);
    if (aid != null) {
      void logAdminAction({
        actorUserId: aid,
        action: "category.update",
        targetType: "Category",
        targetId: String(parsed.data.id),
        metadata: { name: parsed.data.name },
      });
    }
    void bustAdminCategoriesListCache();
    return NextResponse.json(updated, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return jsonInternalServerError(error, "[admin/api/categories PATCH]");
  }
}

export async function DELETE(req: Request) {
  const g = await adminApiRequire("product.delete");
  if (!g.ok) return g.response;

  const idRaw = new URL(req.url).searchParams.get("id");
  const id = idRaw ? Number.parseInt(idRaw, 10) : NaN;
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    const result = await deleteCategory(id);
    if (result && typeof result === "object" && "message" in result) {
      return NextResponse.json(result, { status: 404 });
    }
    const aid = adminActorNumericId(g.user);
    if (aid != null) {
      void logAdminAction({
        actorUserId: aid,
        action: "category.delete",
        targetType: "Category",
        targetId: String(id),
      });
    }
    void bustAdminCategoriesListCache();
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    return jsonInternalServerError(error, "[admin/api/categories DELETE]");
  }
}
